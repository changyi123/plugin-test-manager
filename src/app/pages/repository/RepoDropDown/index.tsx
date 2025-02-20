import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { Button, Dropdown, Menu, message, notification, Spin } from 'antd';
import { MenuItemProps } from 'antd/lib/menu';
import classnames from 'classnames';
import { components, hooks } from 'proxima-sdk';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ActionType as ModelActionType } from '@/components/business/TestEntitySelectorModal';
import ManageWorkspace from '@/components/business/TestEntitySelectorModal/ManageWorkspace';
import { SystemFieldKeys } from '@/components/common/BusinessTable/hook';
import { CustomMore } from '@/icons';
import { copyTestCase, handleSelector } from '@/lib/api/item';
import { searchFields } from '@/lib/api/proxima';
import { getAppEnv } from '@/lib/appEnv';
import {
  AppKey,
  EXPORT_EXCLUDED_TYPES,
  EXPORT_ITEM_FIELDS,
  EXPORT_PLAN_FIELDS,
  EXPORT_TEST_FIELDS,
  IQLFieldNameMapping,
  SystemField,
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
  extraMenuOptions?: MenuItemProps[];
  setPageLoading?: (val: boolean) => void;
  repository?: Record<string, any>;
  selector?: SearchSelectors | string;
}) => {
  const [visible, setVisible] = useState(false);
  const [iql, setIql] = useState('');
  const { t, locale } = useI18n();
  const { workspace } = useTestConfig();
  const { testCaseFieldKeys } = useBaseAction();

  const [testCaseFields, setTestCaseFields] = useState([]);

  useEffect(() => {
    testCaseFieldKeys?.length &&
      searchFields({
        keys: [...testCaseFieldKeys, ...SystemFieldKeys],
        propertyNames: ['name', 'key', 'fieldType'],
        fieldType: true,
      }).then(data => {
        setTestCaseFields(data.filter(f => !EXPORT_EXCLUDED_TYPES.includes(f.fieldType?.key)));
      });
  }, [testCaseFieldKeys]);

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
      notification.open({
        message: t('page.repository.repoDropDown.creatingTestCase'),
        icon: <Spin spinning={true} />,
        duration: null,
      });
      setPageLoading?.(true);
      const copyRes = await copyTestCase({
        caseIds: data.selectedData,
        fields: [].concat(SystemFieldKeys, testCaseFieldKeys),
        repository: folderKey,
        workspaceKey: workspace?.key,
      });
      notification.destroy();
      if (copyRes?.status === 'error') {
        notification.error({
          message: `${t('page.repository.repoDropDown.createTestCaseFail')}：${copyRes.data}`,
        });
      } else {
        // 成功
        notification.success({ message: t('page.repository.repoDropDown.createTestCaseSuccess') });
      }
      // 调接口更新列表
      const proxima = createProximaSdk();
      proxima.execute('updateItemList', { type: 'delete' });
      setPageLoading?.(false);
    }
    return data;
  }, [folderKey, setPageLoading, t, testCaseFieldKeys, workspace?.key]);

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
      } else if (key === 'example') {
        downloadExampleFile([].concat(SystemFieldKeys, testCaseFieldKeys), t, locale);
      } else if (key === 'importFromWorkspace') {
        // 从别的空间导入
        startImportByWorkspace();
      } else if (
        ['exportAll', 'exportChildGroup', 'exportGroup', 'exportFilter', 'exportPlan'].includes(key)
      ) {
        if (
          !folderKey &&
          type === 'repository' &&
          ['exportGroup', 'exportChildGroup'].includes(key)
        ) {
          message.warning(t('page.repository.repoDropDown.importCaseWarning'));
        }

        const params = 'exportFilter' === key ? { repository, selector } : {};
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
                    type: key,
                    checkedId: folderKey,
                    treeData: treeNodeData,
                    workspace,
                    ...params,
                  },
            ),
          ),
        );
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
        readonly: true,
      };
    });
  }, [t, type]);

  const appFields = useMemo(() => {
    const extraCaseFields = [
      {
        value: SystemField.CreatedAt,
        label: t('page.repository.repoDropDown.excelExportTitle.createdAt'),
      },
      {
        value: SystemField.CreatedBy,
        label: t('page.repository.repoDropDown.excelExportTitle.createdBy'),
      },
    ];

    const moreFields = testCaseFields
      .filter(field => !EXPORT_ITEM_FIELDS.some(f => f.value === field.key))
      .map(field => ({ value: field.key, label: field.name }));
    return [...basicFields, ...extraCaseFields, ...moreFields];
  }, [testCaseFields, basicFields, t]);

  const menu = (
    <Menu onClick={e => menuClick(e)}>
      {type === 'repository' && (
        <>
          <Menu.Item key="import">{t('page.repository.repoDropDown.MenuItem.0')}</Menu.Item>
          <Menu.Item key="example">{t('page.repository.repoDropDown.MenuItem.1')}</Menu.Item>
          <Menu.Item key="importFromWorkspace">
            {t('page.repository.repoDropDown.MenuItem.2')}
          </Menu.Item>
          <Menu.Item key="exportAll">{t('page.repository.repoDropDown.MenuItem.3')}</Menu.Item>
          <Menu.Item key="exportGroup">{t('page.repository.repoDropDown.MenuItem.4')}</Menu.Item>
          <Menu.Item key="exportChildGroup">
            {t('page.repository.repoDropDown.MenuItem.5')}
          </Menu.Item>
          <Menu.Item key="exportFilter">{t('page.repository.repoDropDown.MenuItem.7')}</Menu.Item>
        </>
      )}
      {type === 'plan' && (
        <>
          <Menu.Item key="exportPlan" disabled={!selectedTestPlanId}>
            {t('page.repository.repoDropDown.MenuItem.6')}
          </Menu.Item>
        </>
      )}
      {Array.isArray(extraMenuOptions)
        ? extraMenuOptions.map((prop, index) => <Menu.Item key={index} {...prop} />)
        : null}
    </Menu>
  );

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
              exportType="excel"
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
