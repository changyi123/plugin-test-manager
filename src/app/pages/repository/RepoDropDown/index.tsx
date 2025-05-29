import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { Button, Dropdown, Menu, message, notification } from 'antd';
import { MenuItemProps } from 'antd/lib/menu';
import classnames from 'classnames';
import { components, hooks } from 'proxima-sdk';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { importTestCaseWithProcess } from '@/components/business/BatchResult/hooks';
import { ActionType as ModelActionType } from '@/components/business/TestEntitySelectorModal';
import ManageWorkspace from '@/components/business/TestEntitySelectorModal/ManageWorkspace';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { CustomMore } from '@/icons';
import { handleSelector } from '@/lib/api/item';
import { searchFields } from '@/lib/api/proxima';
import { getAppEnv } from '@/lib/appEnv';
import {
  AppKey,
  EXPORT_EXCLUDED_TYPES,
  EXPORT_ITEM_FIELDS,
  EXPORT_PLAN_FIELDS,
  EXPORT_TEST_FIELDS,
  IQLFieldNameMapping,
  JSON_KEY_SUPPORTED_FIELD_TYPES,
  TestLinkType,
  TestType,
} from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getProximaBasePath, getTenantKey, inIframe } from '@/lib/utils/helper';
import { SearchSelectors, selectorToIql } from '@/lib/utils/iql';
import { getRepositoryQuery } from '@/lib/utils/tree';

import { getTreeNodeByKey } from '../util';
import { downloadExampleFile, TreeNode } from './export';

const { ExportModal } = components.Components;
const { FilterProvider, RecoilRoot } = hooks;

const RepoDropDown = ({
  type,
  folderKey,
  className,
  treeNodeData,
  setPageLoading,
  extraMenuOptions,
  selectedTestPlanId,
  repository,
  selector,
}: {
  type: string;
  className?: string;
  folderKey?: string;
  treeNodeData?: TreeNode[];
  selectedTestPlanId?: string;
  filteredCaseIds?: string[];
  extraMenuOptions?: any[];
  setPageLoading?: (val: boolean) => void;
  repository?: Record<string, any>;
  selector?: SearchSelectors | string;
}) => {
  const [visible, setVisible] = useState(false);
  const [iql, setIql] = useState('');
  const [exportType, setExportType] = useState('excel');
  const { t, locale } = useI18n();
  const {
    workspace,
    config: { itemTypeMap },
  } = useTestConfig();
  const { testCaseFieldKeys } = useBaseAction();

  const [testCaseFields, setTestCaseFields] = useState([]);

  useEffect(() => {
    testCaseFieldKeys?.length &&
      searchFields({
        keys: [...testCaseFieldKeys, ...SystemFieldKeys],
        propertyNames: ['name', 'key', 'fieldType'],
        fieldType: true,
      }).then(data => {
        setTestCaseFields(
          data.filter(f =>
            exportType === 'json'
              ? JSON_KEY_SUPPORTED_FIELD_TYPES.includes(f.fieldType?.key)
              : !EXPORT_EXCLUDED_TYPES.includes(f.fieldType?.key),
          ),
        );
      });
  }, [testCaseFieldKeys, exportType]);

  const testEntitySelectorRef = useRef<ModelActionType>();

  const startImportByWorkspace = useCallback(async () => {
    if (!testEntitySelectorRef.current?.open) return;
    const data = await testEntitySelectorRef.current?.open({
      selectValue: [],
      treeType: 'case',
      modelProps: {
        title: t('page.repository.repoDropDown.MenuItem.2'),
        footer: {
          ok: {
            name: t('common.confirm'),
          },
          cancel: {
            name: t('common.cancel'),
          },
        },
      },
    });
    if (data?.selectedData?.length) {
      setPageLoading?.(true);
      await importTestCaseWithProcess({
        caseIds: data.selectedData,
        itemType: itemTypeMap?.TestCase,
        repository: folderKey,
        workspace: workspace as any,
        handleSuccess: () => {
          notification.success({
            message: t('page.repository.repoDropDown.createTestCaseSuccess'),
          });
          // 调接口更新列表
          const proxima = createProximaSdk();
          proxima.execute('updateItemList', { type: 'delete' });
          setPageLoading?.(false);
        },
        handleFail: () => {
          const proxima = createProximaSdk();
          proxima.execute('updateItemList', { type: 'delete' });
          setPageLoading?.(false);
        },
      });
    }
  }, [folderKey, itemTypeMap?.TestCase, setPageLoading, t, workspace]);

  const repositoryQuery2Iql = useCallback(
    repository =>
      repository &&
      `'${IQLFieldNameMapping.repository}' ${repository.operator || 'in'} ${JSON.stringify(
        repository.value ?? repository,
      )}`,
    [],
  );

  const paramsToIql = useCallback(
    params => {
      const { checkedId, type, workspace, treeData, repository, selector } = params;
      const selectTreeNode = getTreeNodeByKey(treeData, checkedId);
      const iqlList = [
        `'${IQLFieldNameMapping.type}' = '${TestType.Case}'`,
        `'${IQLFieldNameMapping.workspaceKey}' = '${workspace.key}'`,
      ];

      switch (type) {
        case 'exportChildGroup':
          iqlList.push(repositoryQuery2Iql(getRepositoryQuery(selectTreeNode, 'all').repository));
          break;
        case 'exportGroup':
          iqlList.push(
            repositoryQuery2Iql(getRepositoryQuery(selectTreeNode, 'current').repository),
          );
          break;
        case 'exportFilter':
          iqlList.push(repositoryQuery2Iql(repository.repository));
          iqlList.push(selectorToIql(handleSelector(selector)));
          break;
        case 'exportPlan':
          iqlList.push(`'${IQLFieldNameMapping.linkItems}' in ['${checkedId}']`);
          iqlList.push(`'${IQLFieldNameMapping.linkType}' = '${TestLinkType.CaseLinkPlan}'`);
          break;
      }
      return iqlList.filter(Boolean).join(' and ');
    },
    [repositoryQuery2Iql],
  );

  const menuClick = useCallback(
    async e => {
      const key = e.key;
      // iframe 中跳转链接增加隐藏 header 和 sider 属性
      const appendedQueryString = inIframe() ? '&hiddenSider=true&hiddenHeader=true' : '';

      if (key === 'import') {
        const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
        // 跳转到导入页面
        const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspace.key}/import/${
          workspace.objectId
        }?app=test_manager&disableToggleWorkspace=true&hiddenItemType=true&validateRequired=${getAppEnv(
          'GROUP_REQUIRED_WHEN_VALIDATE',
        )}${appendedQueryString}`;
        window.open(href);
      } else if (key === 'importJson') {
        const baseUrl = getProximaBasePath() ? `${getProximaBasePath()}` : '/';
        // 跳转到导入页面，并增加 importType=json 参数
        const href = `${baseUrl}/${getTenantKey()}/workspaces/${workspace.key}/import/${
          workspace.objectId
        }?app=test_manager&disableToggleWorkspace=true&hiddenItemType=true&importType=json&validateRequired=${getAppEnv(
          'GROUP_REQUIRED_WHEN_VALIDATE',
        )}${appendedQueryString}`;
        window.open(href);
      } else if (key === 'example') {
        downloadExampleFile([].concat(SystemFieldKeys, testCaseFieldKeys), t, locale);
      } else if (key === 'importFromWorkspace') {
        // 从别的空间导入
        startImportByWorkspace();
      } else if (
        [
          'exportAll',
          'exportChildGroup',
          'exportGroup',
          'exportFilter',
          'exportPlan',
          'exportJsonFiltered',
        ].includes(key)
      ) {
        if (
          !folderKey &&
          type === 'repository' &&
          ['exportGroup', 'exportChildGroup'].includes(key)
        ) {
          message.warning(t('page.repository.repoDropDown.importCaseWarning'));
        }

        const params =
          'exportFilter' === key || 'exportJsonFiltered' === key ? { repository, selector } : {};
        setIql(
          paramsToIql(
            Object.assign(
              {},
              type === 'plan'
                ? {
                    type: key,
                    checkedId: selectedTestPlanId,
                    workspace,
                  }
                : {
                    type: 'exportJsonFiltered' === key ? 'exportFilter' : key, // Reuse 'exportFilter' logic for IQL generation
                    checkedId: folderKey,
                    treeData: treeNodeData,
                    workspace,
                    ...params,
                  },
            ),
          ),
        );
        if (key === 'exportJsonFiltered') {
          setExportType('json');
        } else {
          setExportType('excel');
        }
        setVisible(true);
      }
    },
    [
      workspace,
      testCaseFieldKeys,
      t,
      locale,
      startImportByWorkspace,
      folderKey,
      type,
      repository,
      selector,
      paramsToIql,
      selectedTestPlanId,
      treeNodeData,
    ],
  );

  const refresh = useCallback(() => {}, []);

  const extraParams = useMemo(
    () => ({
      planId: type === 'plan' && selectedTestPlanId,
      iqlContext: {
        displayContext: AppKey,
      },
      fileName: `${
        type === 'exportPlan'
          ? t('page.repository.repoDropDown.importPlanLinkCase')
          : t('page.repository.repoDropDown.importRepoCase')
      }-${workspace?.name}`,
    }),
    [selectedTestPlanId, t, type, workspace?.name],
  );

  const basicFields = useMemo(() => {
    const basic = [...EXPORT_ITEM_FIELDS, ...EXPORT_TEST_FIELDS];
    const fields = type === 'plan' ? [...basic, ...EXPORT_PLAN_FIELDS] : basic;
    const defaultNameConfig = getAppEnv('CREATE_EXECUTION_DEFAULT_NAME_CONFIG');
    const enable = defaultNameConfig?.enable;

    return fields.map(field => {
      return {
        ...field,
        label: t(
          `page.repository.repoDropDown.excelExportTitle.${
            enable && field.label === 'data' ? 'preData' : field.label
          }`,
        ),
        checked: true,
        readonly: exportType === 'json' ? false : true,
      };
    });
  }, [t, type, exportType]);

  const appFields = useMemo(() => {
    const moreFields = testCaseFields
      .filter(field => !EXPORT_ITEM_FIELDS.some(f => f.value === field.key))
      .map(field => ({ value: field.key, label: field.name }));
    return [...basicFields, ...moreFields];
  }, [testCaseFields, basicFields]);

  const isEnableJsonImport = getAppEnv('ENABLE_JSON_IMPORT');

  const menu = useMemo(() => {
    const commonItems = [
      isEnableJsonImport && {
        key: 'importJson',
        label: t('page.repository.repoDropDown.MenuItem.importJson'), // 用例导入（json）
      },
      {
        key: 'import',
        label: t('page.repository.repoDropDown.MenuItem.0'), // 用例导入
      },
      {
        key: 'example',
        label: t('page.repository.repoDropDown.MenuItem.1'), // 示例文件
      },
      {
        key: 'importFromWorkspace',
        label: t('page.repository.repoDropDown.MenuItem.2'), // 从别的空间导入
      },
    ].filter(Boolean);

    const repositoryItems = [
      {
        key: 'exportAll',
        label: t('page.repository.repoDropDown.MenuItem.3'), // 导出所有用例
      },
      {
        key: 'exportGroup',
        label: t('page.repository.repoDropDown.MenuItem.4'), // 导出分组用例
      },
      {
        key: 'exportChildGroup',
        label: t('page.repository.repoDropDown.MenuItem.5'), // 导出子分组用例
      },
      {
        key: 'exportFilter',
        label: t('page.repository.repoDropDown.MenuItem.7'), // 导出过滤用例
      },
      isEnableJsonImport && {
        key: 'exportJsonFiltered',
        label: t('page.repository.repoDropDown.MenuItem.exportJsonFiltered'), // 导出用例json文件（筛选结果）
      },
    ].filter(Boolean);

    const planItems = [
      {
        key: 'exportPlan',
        label: t('page.repository.repoDropDown.MenuItem.6'), // 导出计划用例
        disabled: !selectedTestPlanId,
      },
    ];

    const extraItems = Array.isArray(extraMenuOptions)
      ? extraMenuOptions.map((prop, index) => ({
          key: index.toString(),
          label: prop.label,
        }))
      : null;

    return (
      <Menu onClick={e => menuClick(e)}>
        {type === 'repository' && (
          <>
            {commonItems.map(item => (
              <Menu.Item key={item.key}>{item.label}</Menu.Item>
            ))}
            {repositoryItems.map(item => (
              <Menu.Item key={item.key}>{item.label}</Menu.Item>
            ))}
            {extraItems}
          </>
        )}
        {type === 'plan' && (
          <>
            {commonItems.map(item => (
              <Menu.Item key={item.key}>{item.label}</Menu.Item>
            ))}
            {planItems.map(item => (
              <Menu.Item key={item.key}>{item.label}</Menu.Item>
            ))}
            {extraItems}
          </>
        )}
      </Menu>
    );
  }, [type, selectedTestPlanId, t, menuClick, extraMenuOptions, isEnableJsonImport]);

  return (
    <>
      <Dropdown dropdownRender={() => menu} placement="bottomLeft">
        <Button className={classnames(className)} icon={<CustomMore />} />
      </Dropdown>
      {/* 规划空间测试用例 */}
      <Suspense fallback={null}>
        <RecoilRoot>
          <FilterProvider>
            <ExportModal
              iql={iql}
              exportModalVisible={visible}
              setExportModalVisible={setVisible}
              workspace={workspace}
              appKey={AppKey}
              appFields={appFields}
              extraParams={extraParams}
              exportType={exportType}
            />
          </FilterProvider>
        </RecoilRoot>
      </Suspense>
      <ManageWorkspace
        title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
        testType={TestType.Case}
        actionRef={testEntitySelectorRef}
        onCancel={() => {
          refresh();
        }}
        afterClose={() => {
          refresh();
        }}
      />
    </>
  );
};

export default RepoDropDown;
