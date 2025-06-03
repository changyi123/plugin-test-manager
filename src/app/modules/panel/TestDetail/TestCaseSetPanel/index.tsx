import { DownOutlined } from '@ant-design/icons';
import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { message, notification } from 'antd';
import { TestFiledKeyMapping, TestType } from 'common/constant';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { updateItemsWithProcess } from '@/components/business/BatchResult/hooks';
import DropDownButton from '@/components/business/DropDownButton';
import PanelTable, {
  ActionType,
  BuiltinColumns,
  columnBuilder,
} from '@/components/business/PanelTable';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { getTestEntityByQuery } from '@/lib/api/item';
import { getItemByIQL } from '@/lib/api/proxima';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { actionConfirm, alert, getTestManagerContainer } from '@/lib/utils/helper';

import cx from './index.less';
const proxima = createProximaSdk();

const TestCaseSetPanel = () => {
  const { t } = useI18n();
  const { testEntity, workspace, setTestEntity } = useTestConfig();
  const [loading, setLoading] = useState(false);
  const { createItemUseModal, getCreatePermission } = useBaseAction();
  const tableActionRef = useRef<ActionType>();
  const selectorModalRef = useRef<SelectorActionType>();

  const [testsetIds, setTestsetIds] = useState([]);

  // 更新provider
  const updateTestEntity = useCallback(async () => {
    const {
      items: [data],
    } = await getItemByIQL({ itemId: testEntity.objectId });
    setTestEntity(data);
  }, [setTestEntity, testEntity.objectId]);

  // 刷新数据
  const refreshDepData = useCallback(async () => {
    await updateTestEntity();
    tableActionRef.current.refresh();
    await proxima.execute('updateItemList');
  }, [updateTestEntity]);

  const getTestEntityDetailFn = useCallback(async () => {
    let result = { list: [], total: 0 };
    try {
      const res = await getTestEntityByQuery({
        query: {
          workspaceKey: workspace?.key,
          type: TestType.Case,
          id: [testEntity?.objectId],
        },
        fields: ['r_test_manager_referenceSet'],
      });
      result = res;
    } catch (e) {
      //   暂时不显示错误
    }
    return result;
  }, [testEntity?.objectId, workspace?.key]);
  // 更新列表数据
  const tableDataSourceGetter = useCallback(
    async params => {
      // 先查询
      const { list, total } = await getTestEntityDetailFn();
      if (total === 0) {
        return {
          list: [],
          total: 0,
        };
      }
      // 不明白为什么到这之后用例集转换成testSet属性了，并且还在数据的第一层
      const _testCaseSets = list?.[0]?.testSet ?? [];
      setTestsetIds(_testCaseSets);
      const { list: list1, total: total1 } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspace?.key,
          type: TestType.CaseSet,
          id: _testCaseSets,
        },
        fields: ['name', 'key', 'workflowStatus', 'objectId', 'id'],
        ...params,
      });

      return {
        list: list1,
        total: total1,
      };
    },
    [setTestsetIds, workspace],
  );

  // 添加测试计划菜单
  const testsetMenuList = useMemo(() => {
    return [
      {
        title: t('modules.panel.testDetail.testCaseSetPanel.menuList.0'),
        disabled: getCreatePermission(TestType.CaseSet),
        async onClick() {
          const itemData = await createItemUseModal({
            type: TestType.CaseSet,
            extraData: {
              isDisableCreateNext: true,
            },
          });

          setLoading(true);
          await updateItemsWithProcess({
            title: '用例规划中',
            items: [testEntity.objectId],
            fields: {
              values: {},
            },
            update: {
              [TestFiledKeyMapping.testSet]: {
                add: [itemData?.item?.objectId],
              },
            },
            handleSuccess: () => {
              refreshDepData();
              setLoading(false);
              notification.success({
                message: t('modules.panel.testDetail.testCaseSetPanel.deleteCaseSetSuccessMessage'),
              });
            },
            handleFail: error => {
              setLoading(false);
              message.error(error.message);
            },
          });
        },
      },
      {
        title: t('modules.panel.testDetail.testCaseSetPanel.menuList.1'),
        async onClick() {
          const testSetIds = await selectorModalRef.current.open();
          if (!testSetIds.length) {
            return notification.warning({
              message: t('modules.panel.testDetail.testCaseSetPanel.notSelectMessage'),
            });
          }

          setLoading(true);
          await updateItemsWithProcess({
            title: '用例规划中',
            items: [testEntity.objectId],
            fields: {
              values: {},
            },
            update: {
              [TestFiledKeyMapping.testSet]: {
                add: testSetIds,
              },
            },
            handleSuccess: () => {
              setLoading(false);
              refreshDepData();
              notification.warning({
                message: t('modules.panel.testDetail.testCaseSetPanel.addCaseSetSuccessMessage'),
              });
            },
            handleFail: error => {
              setLoading(false);
              message.error(error.message);
            },
          });
        },
      },
    ];
  }, [createItemUseModal, refreshDepData, getCreatePermission, testEntity.objectId, t]);

  const removeCaseFromCaseSet = useCallback(
    async casesetIds => {
      if (!Array.isArray(casesetIds)) return;
      // 高并发场景下，可能会出现想删除的时候，已经没有关联的用例集了，所以需要先查询一下
      const { list } = await getTestEntityDetailFn();
      const _testCaseSets = list?.[0]?.testSet ?? [];
      setTestsetIds(_testCaseSets);
      if (_testCaseSets.length === 0) {
        return message.error(
          t('modules.panel.testDetail.testCaseSetPanel.hasNoAttashTestSetMessage'),
        );
      }
      // 防止页面停留太久，高并发问题，然后在重新获取数据
      const newTestsetIds = _testCaseSets.filter(item => !casesetIds.includes(item));
      await updateItemsWithProcess({
        title: '从用例集移除该用例中',
        items: [testEntity?.objectId],
        fields: {
          values: {
            [TestFiledKeyMapping.testSet]: [],
          },
        },
        update: {
          [TestFiledKeyMapping.testSet]: {
            add: newTestsetIds,
          },
        },
        handleSuccess: () => {
          refreshDepData();
          alert({
            type: 'success',
            message: t('modules.panel.testDetail.testCaseSetPanel.deleteCaseSetSuccessMessage'),
          });
        },
        handleFail: error => {
          setLoading(false);
          message.error(error.message);
        },
      });
      // await updateItemsV2({
      //   items: [testEntity?.objectId],
      //   fields: {
      //     values: {},
      //   },
      //   update: {
      //     [TestFiledKeyMapping.testSet]: {
      //       // remove: casesetIds?.Fe[0], 生效的
      //       add: newTestsetIds,
      //     },
      //   },
      // });
      // refreshDepData();
      // alert({
      //   type: 'success',
      //   message: t('modules.panel.testDetail.testCaseSetPanel.deleteCaseSetSuccessMessage'),
      // });
    },
    [refreshDepData, testEntity.objectId, t, testsetIds],
  );

  // table column 数据
  const tableColumns = useMemo(() => {
    return [
      columnBuilder(BuiltinColumns.getItemKey(t), item => ({
        item,
      })),
      columnBuilder(BuiltinColumns.getItemTitle(t), item => ({
        item,
      })),
      // {
      //   title: t('modules.panel.testDetail.testCaseSetPanel.caseCount'),
      //   key: 'workflowStatus',
      //   width: 100,
      //   render(_, record) {
      //     return (
      //       <StatusBadge
      //         showBg
      //         className={cx('status-btn')}
      //         status={record?.workflowStatus.type}
      //         readonly
      //         hideIcon
      //       />
      //     );
      //   },
      // },
      {
        title: t('common.action'),
        key: 'action',
        fixed: 'right',
        render: (_, record) => (
          <a
            onClick={() => {
              actionConfirm(
                {
                  title: t('common.tip'),
                  okText: t('common.okText'),
                  cancelText: t('common.cancel'),
                  content: t('modules.panel.testDetail.testCaseSetPanel.confirmDeleteTestCaseTips'),
                },
                async () => {
                  removeCaseFromCaseSet([record.objectId]);
                },
              );
            }}
          >
            {t('common.remove')}
          </a>
        ),
      },
    ] as any[];
  }, [removeCaseFromCaseSet, t]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title={t('modules.panel.testDetail.testCaseSetPanel.modelTitle')}
        actionRef={selectorModalRef}
        testType={TestType.CaseSet}
        ignoreTestEntityIds={testsetIds}
        getContainer={getTestManagerContainer}
      />
      <PanelTable
        renderActions={() => (
          <DropDownButton menuList={testsetMenuList}>
            {t('modules.panel.testDetail.testCaseSetPanel.dropToCaseSet')}
            <DownOutlined />
          </DropDownButton>
        )}
        actionMenuList={[
          {
            key: 'delete',
            content: t('common.delete'),
            onClick(selectedRowKeys) {
              removeCaseFromCaseSet(selectedRowKeys);
            },
          },
        ]}
        loading={loading}
        actionRef={tableActionRef}
        rowKey="objectId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
        allSelectableRowKeys={testsetIds}
      />
    </div>
  );
};

TestCaseSetPanel.displayName = 'TestCaseSetPanel';
export default React.memo(TestCaseSetPanel);
