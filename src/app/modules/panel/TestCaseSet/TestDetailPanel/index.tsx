import createProximaSdk, { useListener } from '@projectproxima/proxima-sdk-js';
import { useMemoizedFn } from 'ahooks';
import { Button, Dropdown, Menu, message, notification, Popconfirm, Typography } from 'antd';
import { keyBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { updateItemsWithProcess } from '@/components/business/BatchResult/hooks';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import RenderRepository from '@/components/business/RenderRepository';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { getTestEntityByQuery } from '@/lib/api/item';
import { TestFiledKeyMapping, TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { getRootContainer, goToItemDetailPage } from '@/lib/utils/helper';

import cx from './index.less';

const useFnHookTriggerFn = (fn, before, after) => {
  return React.useCallback(
    async (...args) => {
      let res;
      try {
        before?.();
        res = await fn?.(...args);
      } catch (err) {
        console.error(err);
      }
      after?.();
      return res;
    },
    [after, before, fn],
  );
};

const Test = () => {
  const proxima = createProximaSdk();
  const { t } = useI18n();
  const { testEntity, workspace, config } = useTestConfig();
  const { getCreatePermission, globalTestConfig, createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();
  const [loading, setLoading] = useState(false);
  const testEntitySelectorRef = React.useRef<SelectorActionType>();

  const [allTestEntities, setAllTestEntities] = useState([]);

  //  获取用例集下全部用例
  const testCaseTableDataGetter = useFnHookTriggerFn(
    useCallback(
      async queryParams => {
        const { list, total } = await getTestEntityByQuery({
          query: {
            workspaceKey: workspace?.key,
            type: TestType.Case,
            repository: '',
            fields: [TestFiledKeyMapping.testSet],
          },
          ...queryParams,
          selector: `'测试用例集' in ['${testEntity.objectId}']`,
        });
        return {
          list: list,
          total: total,
        };
      },
      [testEntity.objectId, workspace?.key],
    ),
    () => {
      setLoading(true);
    },
    () => {
      setLoading(false);
    },
  );

  const statusesConfig = useMemo(() => {
    return keyBy(globalTestConfig?.statuses ?? [], 'key');
  }, [globalTestConfig]);

  // 所有的测试执行
  const allTestEntityIds = React.useMemo(
    () => allTestEntities.map(entity => entity.id),
    [allTestEntities],
  );

  const getAllRelTestEntities = useCallback(async () => {
    const { list, total } = await testCaseTableDataGetter({
      offset: 0,
      limit: 99999,
      // select: ['referenceCase', 'status', 'id'],
    });
    setAllTestEntities(list);
    return { list, total };
  }, [testCaseTableDataGetter, setAllTestEntities]);

  useEffect(() => {
    getAllRelTestEntities();
  }, []);

  const refreshDepData = React.useCallback(
    async (eventKey?: string) => {
      // 全量数据
      const data = await testCaseTableDataGetter();
      tableActionRef.current.refresh();
      // 修改执行状态，移除或者添加用例，需要更新外部列表
      proxima.execute(eventKey ?? 'updateRepoTree');
      return data;
    },
    [proxima, testCaseTableDataGetter],
  );

  useListener('refreshTestRunPanel', () => {
    refreshDepData();
  });

  /**
   * 移除测试用例
   */
  const removeTestCaseFromSet = useMemoizedFn(async selectedCaseIds => {
    if (!Array.isArray(selectedCaseIds) || selectedCaseIds?.length === 0) {
      return;
    }
    await updateItemsWithProcess({
      title: '用例移除中',
      items: selectedCaseIds,
      fields: {
        values: {},
      },
      update: {
        [TestFiledKeyMapping.testSet]: {
          remove: testEntity.objectId,
        },
      },
      handleSuccess: () => {
        message.success(t('page.testset.testEntityList.removeCaseFromSetSuccessMsg'));
        setTimeout(() => {
          refreshDepData();
        }, 500);
      },
      handleFail: error => {
        message.error(error.message);
      },
    });
  });
  /**
   * 添加新的测试用例
   */
  const handleCreateCase = useCallback(async () => {
    const itemData = await createItemUseModal({
      type: TestType.Case,
      extraData: {
        isDisableCreateNext: true,
      },
    });
    await updateItemsWithProcess({
      title: t('page.testset.CaseSetPageLayout.right.planTestIng'),
      items: [itemData?.item?.objectId],
      fields: {
        values: {},
      },
      update: {
        [TestFiledKeyMapping.testSet]: {
          add: testEntity.objectId,
        },
      },
      handleSuccess: () => {
        setTimeout(() => {
          refreshDepData();
        }, 500);
      },
      handleFail: error => {
        message.error(error.message);
      },
    });
  }, [createItemUseModal, t, testEntity.objectId, refreshDepData]);

  /**
   * 添加已有测试用例
   */
  const addExistTestCase = useCallback(async () => {
    const itemData = await testEntitySelectorRef.current.open();

    if (!itemData.length) {
      return notification.warning({
        message: t('page.testset.CaseSetPageLayout.right.notSelectMessage'),
      });
    }

    await updateItemsWithProcess({
      title: t('page.testset.CaseSetPageLayout.right.planTestIng'),
      items: itemData,
      fields: {
        values: {},
      },
      update: {
        [TestFiledKeyMapping.testSet]: {
          add: testEntity.objectId,
        },
      },
      handleSuccess: () => {
        setTimeout(() => {
          refreshDepData();
        }, 500);
      },
      handleFail: error => {
        message.error(error.message);
      },
    });
  }, [t, testEntity.objectId, refreshDepData]);

  /**
   * 添加测试用例
   */
  const menuClick = useCallback(
    async e => {
      const key = e.key;
      if (key === 'addNewTestCase') {
        await handleCreateCase();
        return;
      }
      if (key === 'addHaveTestCase') {
        await addExistTestCase();
      }
    },
    [addExistTestCase, handleCreateCase],
  );

  // 添加测试用例菜单m
  const menuList = useMemo(() => {
    return (
      <Menu onClick={e => menuClick(e)}>
        <Menu.Item key="addNewTestCase">
          {t('modules.panel.testCaseSet.testAddPanel.newTestCase')}
        </Menu.Item>
        <Menu.Item key="addHaveTestCase">
          {t('modules.panel.testCaseSet.testAddPanel.addHaveTestCase')}
        </Menu.Item>
      </Menu>
    );
  }, [menuClick, t]);

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      {
        title: t('modules.panel.testExecution.testDetailPanel.itemKey'),
        key: 'key',
        width: 170,
        render(_, item) {
          return (
            <Typography.Link
              ellipsis={true}
              target="_blank"
              onClick={() => {
                // if (item?.referenceCaseSnapshot && config?.enableCaseSnapshot)
                //   openBaseLineViewItemModal(item?.key, item?.referenceCaseSnapshot);
                // else
                goToItemDetailPage({
                  workspaceKey: item?.workspace?.key,
                  itemKey: item?.key,
                });
              }}
            >
              {item?.key}
            </Typography.Link>
          );
        },
      },
      {
        title: t('modules.panel.testExecution.testDetailPanel.itemName'),
        key: 'name',
        render(_, record) {
          const name = record?.name;

          return <Typography.Text ellipsis={{ tooltip: name }}>{name}</Typography.Text>;
        },
      },
      {
        key: 'repositoryGroup',
        title: t('page.plan.testEntityList.repositoryGroup'),
        sorter: {
          compare: (a, b) => {
            return +new Date(a.createdAt) - +new Date(b.createdAt);
          },
        },
        width: 200,
        render(_, rowData) {
          return <RenderRepository repository={rowData?.repository} />;
        },
      },
      {
        title: t('common.action'),
        key: 'action',
        render: (_, record) => {
          return (
            <Popconfirm
              okText={t('common.confirm')}
              placement="left"
              cancelText={t('common.cancel')}
              title={t('page.testset.testEntityList.removeCaseTips')}
              getPopupContainer={getRootContainer}
              onConfirm={() => removeTestCaseFromSet([record.objectId])}
            >
              <Button size="small" type="link">
                {t('common.remove')}
              </Button>
            </Popconfirm>
          );
        },
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    testEntity?.linkItems,
    refreshDepData,
    allTestEntities,
    removeTestCaseFromSet,
    statusesConfig,
    config,
  ]);
  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
        showDefaultRange
        testType={TestType.Case}
        isPlanForTestSet={true}
        caseSetId={testEntity?.objectId}
        actionRef={testEntitySelectorRef}
        ignoreTestEntityIds={[]}
      />

      {/* <StatusProcessBar status={relRunStatuses} /> */}

      <PanelTable
        renderActions={() => (
          <Dropdown
            disabled={getCreatePermission(TestType.Case)}
            dropdownRender={() => menuList}
            placement="bottomLeft"
          >
            <Button type="primary">{t('modules.panel.testCaseSet.testAddPanel.modelTitle')}</Button>
          </Dropdown>
        )}
        loading={loading}
        actionRef={tableActionRef}
        allSelectableRowKeys={allTestEntityIds}
        actionMenuList={[
          {
            key: 'delete',
            content: t('common.remove'),
            onClick(selectedRowKeys) {
              removeTestCaseFromSet(selectedRowKeys);
            },
          },
        ]}
        rowKey="objectId"
        columns={tableColumns}
        getDataSource={testCaseTableDataGetter}
      />
    </div>
  );
};

export default React.memo(Test);
