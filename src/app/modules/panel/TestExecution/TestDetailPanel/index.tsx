import React, { useCallback, useState } from 'react';
import { Typography, message, Space, Button, Divider, Popconfirm } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { TestRelationType, TestType, TestLinkType } from '@/lib/constants';
import PanelTable, { ActionType } from '@/components/business/PanelTable';
import DropDownButton from '@/components/business/DropDownButton';
import { toggleTestRunStatus, createTestRunAndRelation } from '@/lib/api/runs';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation } from '@/lib/api/common';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import TestRunModal, {
  ActionType as TestRunModalActionType,
} from '@/components/business/TestRunModal';
import { getRootContainer, goToItemDetailPage } from '@/lib/utils/helper';
import { StatusBadge } from '@/components/business/Status';
import { INITIAL_STATUS_KEY } from '@/lib/constants';
import StatusProcessBar from '@/components/business/StatusProcessBar';
import { fetchLinkList, removeCaseLinkPlan } from '@/lib/api/common';
import cx from './index.less';

const Test = () => {
  const { testEntity, workspace } = useTestConfig();
  const tableActionRef = React.useRef<ActionType>();

  const selectorModalRef = React.useRef<SelectorActionType>();
  const testRunModalActionRef = React.useRef<TestRunModalActionType>();

  const [allTestEntities, setAllTestEntities] = useState([]);

  // 获取测试任务下的测试执行
  const getAllRelTestEntities = useCallback(
    async params => {
      const { list, total } = await fetchLinkList({
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: testEntity?.objectId,
        destinationType: TestType.Execution,
        workspaceKey: workspace?.key,
        ...params,
      });
      setAllTestEntities(list);
      return { list, total };
    },
    [testEntity?.objectId, workspace?.key],
  );

  // 所有的测试执行
  const allTestRunIds = React.useMemo(
    () => allTestEntities.map(entity => entity.objectId),
    [allTestEntities],
  );

  const { relTestDetailIds } = React.useMemo(() => {
    return {
      relTestDetailIds: allTestEntities.map(item => item.runReferenceDetail?.objectId),
      relRunStatuses: allTestEntities.map(item => item.status ?? INITIAL_STATUS_KEY),
    };
  }, [allTestEntities]);

  const refreshDepData = React.useCallback(() => {
    tableActionRef.current.refresh();
  }, []);

  const { data: testPlanData } = useRequest(
    async () => {
      return {objectId: 'xxx'};
    },
    {
      refreshDeps: [testEntity.objectId],
    },
  );

  const tableDataSourceGetter = React.useCallback(
    params => getAllRelTestEntities(params),
    [getAllRelTestEntities],
  );

  const removeTestRelation = React.useCallback(
    async testRunIds => {
      if (!Array.isArray(testRunIds)) return;
      // 删除测试任务和测试执行的关联
      await Promise.all(
        testRunIds.map(id =>
          removeCaseLinkPlan({
            testPlan: [testEntity?.objectId],
            testDetail: allTestEntities.find(item => item.objectId === id),
          }),
        ),
      );

      refreshDepData();

      message.success('删除成功');
    },
    [allTestEntities, refreshDepData, testEntity?.objectId],
  );

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      {
        title: '事项key',
        key: 'key',
        width: 100,
        render(_, record) {
          const item = record?.runReferenceDetail?.reference;
          return (
            <Typography.Link
              ellipsis={true}
              target="_blank"
              onClick={() =>
                goToItemDetailPage({
                  workspaceKey: item?.workspace?.key,
                  itemKey: item?.key,
                })
              }
            >
              {item?.key}
            </Typography.Link>
          );
        },
      },
      {
        title: '事项名',
        key: 'name',
        render(_, record) {
          const name = record?.runReferenceDetail?.reference?.name;

          return <Typography.Text ellipsis={{ tooltip: name }}>{name}</Typography.Text>;
        },
      },
      {
        title: '执行状态',
        dataIndex: 'status',
        key: 'status',
        render: (_, record) => {
          const handleStatusChange = async status => {
            await toggleTestRunStatus(record.objectId, status, testPlanData.objectId);
            refreshDepData();
          };
          return (
            <StatusBadge
              status={record?.status}
              useRootContainer
              onStatusChange={handleStatusChange}
            />
          );
        },
      },
      {
        title: '操作',
        key: 'testRunId',
        render: (_, item) => (
          <Space split={<Divider type="vertical" />} size={0} style={{ marginLeft: -4 }}>
            <Button
              onClick={async () => {
                await testRunModalActionRef.current.open({
                  testId: item.objectId,
                  testIdSequence: allTestRunIds,
                });
                refreshDepData();
              }}
              size="small"
              type="link"
            >
              执行
            </Button>
            <Popconfirm
              okText="确定"
              placement="left"
              cancelText="取消"
              title="当前操作会移除该测试执行，是否继续执行？"
              getPopupContainer={() => getRootContainer()}
              onConfirm={() => removeTestRelation([item.objectId])}
            >
              <Button size="small" type="link">
                移除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [allTestRunIds, refreshDepData, removeTestRelation, testPlanData]);

  // 添加测试用例菜单
  const testDetailMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        async onClick() {
          const selectedTestDetailIds = await selectorModalRef.current.open({
            testType: TestType.Case,
          });

          const _selectedTestDetailIds = selectedTestDetailIds.filter(
            d => !(relTestDetailIds ?? []).includes(d),
          );

          // 添加关联
          

          refreshDepData();
        },
      },
    ];
  }, [refreshDepData, relTestDetailIds]);

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        actionRef={selectorModalRef}
        title="添加测试用例到当前测试执行"
        ignoreTestEntityIds={relTestDetailIds}
      />

      {/* <StatusProcessBar status={relRunStatuses} /> */}

      <PanelTable
        renderActions={() => (
          <DropDownButton menuList={testDetailMenuList}>
            添加用例 <DownOutlined />
          </DropDownButton>
        )}
        actionRef={tableActionRef}
        actionMenuList={[
          {
            title: '删除',
            onClick(selectedRowKeys) {
              removeTestRelation(selectedRowKeys);
            },
          },
        ]}
        rowKey="objectId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
      />

      <TestRunModal
        className={cx('run-modal')}
        actionRef={testRunModalActionRef}
        selectedTestPlanId={testPlanData?.objectId}
      />
    </div>
  );
};

export default React.memo(Test);
