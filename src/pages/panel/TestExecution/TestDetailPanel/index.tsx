import React from 'react';
import { uniqueId } from 'lodash';
import { Typography, message, Space, Button, Divider, Popconfirm } from '@osui/ui';
import { DownOutlined } from '@ant-design/icons';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '@/components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import { toggleTestRunStatus } from '@/lib/api/runs';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';
import { addTestRunToExecution } from './services';
import TestRunModal from '@/pages/run/Modal';
import { StatusBadge } from '@/components/common/Status';
import { getRootContainer } from '@/lib/utils/helper';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();
  const tableActionRef = React.useRef<ActionType>();

  const selectorModalRef = React.useRef<SelectorActionType>();

  const tableDataSourceGetter = React.useCallback(
    queryParams => {
      return getTestEntitiesByRelation(
        TestRelationType.ExecutionRelRun,
        { from: testEntity },
        {
          fillItemData: true,
          queryParams: queryParams,
          include: ['runReferenceDetail'],
        },
      );
    },
    [testEntity],
  );

  const createTestDetail = React.useCallback(async () => {
    const token = uniqueId('TestDetail');
    const res = await createItemUseModal({
      extraData: { token },
      // TODO: 测试执行 name
      name: uniqueId('测试用例'),
      type: TestType.TestExecution,
    });

    const { testEntity: testDetailEntity, extraData } = res;
    // token 不相同则不创建关联
    if (extraData.token !== token) return;

    // const testExecutionData = testDetailEntity.toJSON();

    // const testExecution = await createTestExecutionService({
    //   testPlan: testEntity,
    //   testExecution: testDetailEntity,
    //   workspaceKey: (testExecutionData.reference.workspace as Workspace).key,
    // });
  }, [createItemUseModal]);

  const removeTestRelation = React.useCallback(async relationTypeIds => {
    if (!Array.isArray(relationTypeIds)) return;
    await removeTestRelations(relationTypeIds);

    tableActionRef.current.refresh();

    message.success('删除成功');
  }, []);

  // table column 数据
  const tableColumns = React.useMemo(() => {
    return [
      {
        title: '事项key',
        key: 'reference.name',
        width: 100,
        render(_, record) {
          const item = record?.reference;
          return (
            <Typography.Link
              ellipsis={true}
              target="_blank"
              href={`/osc/workspaces/${item?.workspace?.key}/item/${item?.key}`}
            >
              {item?.key}
            </Typography.Link>
          );
        },
      },
      {
        title: '事项名',
        key: 'reference.name',
        render(_, record) {
          const name = record?.reference?.name;

          return <Typography.Text ellipsis={{ tooltip: name }}>{name}</Typography.Text>;
        },
      },
      {
        title: '执行状态',
        dataIndex: 'status',
        key: 'status',
        render: (_, record) => {
          const handleStatusChange = async status => {
            await toggleTestRunStatus(record.objectId, status);
            tableActionRef.current.refresh();
          };
          return <StatusBadge status={record?.status} onStatusChange={handleStatusChange} />;
        },
      },
      {
        title: '操作',
        key: 'testRunId',
        render: (value, item) => (
          <Space split={<Divider type="vertical" />} size={0} style={{ marginLeft: -4 }}>
            <TestRunModal
              testId={item.objectId}
              onCancel={() => setTimeout(() => tableActionRef.current.refresh(), 200)}
              trigger={
                <Button size="small" type="link">
                  执行
                </Button>
              }
            />
            <Popconfirm
              placement="left"
              getPopupContainer={() => getRootContainer()}
              title="当前操作会删除该测试执行，是否继续执行？"
              onConfirm={() => removeTestRelation([item.testRelationId])}
              okText="确定"
              cancelText="取消"
            >
              <Button size="small" type="link">
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ];
  }, [removeTestRelation]);

  // 添加测试用例菜单
  const testDetailMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        onClick() {
          selectorModalRef.current.open({
            testType: TestType.TestDetail,
          });
        },
      },
      // {
      //   title: '新增测试用例',
      //   onClick() {
      //     createTestDetail();
      //   },
      // },
    ];
  }, []);

  // 添加测试用例添加到测试执行
  const addTestDetailToPlan = React.useCallback(
    async testIds => {
      if (testIds.length) {
        message.info('后台添加中...');
        addTestRunToExecution({
          testExecution: testEntity,
          testIds,
        }).then(() => {
          tableActionRef.current.refresh();
        });
        return;
      }

      tableActionRef.current.refresh();
    },
    [testEntity],
  );

  return (
    <div className={cx('test')}>
      <TestEntitySelectorModal
        title="添加测试用例到当前测试执行"
        onSelect={addTestDetailToPlan}
        actionRef={selectorModalRef}
      />
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
        rowKey="testRelationId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
      />
    </div>
  );
};

export default React.memo(Test);
