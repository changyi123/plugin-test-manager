import React from 'react';
import { uniqueId } from 'lodash';
import { Typography, message, Space } from '@osui/ui';
import { EllipsisOutlined, DownOutlined } from '@ant-design/icons';
import { TestType, TestRelationType } from '@/lib/constants';
import PanelTable, { ActionType } from '../../../../../components/panel/PanelTable';
import DropDownButton from '@/components/panel/DropDownButton';
import TestTableStatus from '@/pages/run/components/TestTableStatus';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation, removeTestRelations } from '@/lib/api/common';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/panel/TestEntitySelectorModal';
import { addTestRunToExecution } from './services';

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
          // async resultTransfer(data) {
          //   const { list, count } = data;
          //   const itemIds = list?.map(item => item?.runReferenceDetail?.reference?.objectId);
          //   const itemListRes = await getItemByIQL({ itemId: itemIds });
          //   const itemList = itemListRes.items;
          //   const listBak = [...list];
          //   listBak?.forEach(item => {
          //     itemList?.forEach(item2 => {
          //       if (item?.runReferenceDetail?.reference?.objectId === item2?.objectId) {
          //         item.itemDetail = item2;
          //       }
          //     });
          //   });
          //   console.log('listBak', listBak);
          //   return {
          //     count,
          //     list: listBak,
          //   };
          // },
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
          const item = record?.runReferenceDetail?.reference;
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
          const name = record?.runReferenceDetail?.reference?.name;

          return <Typography.Text ellipsis={{ tooltip: name }}>{name}</Typography.Text>;
        },
      },
      {
        title: '最新执行状态',
        dataIndex: 'status',
        key: 'status',
        render: (value, item) => {
          return (
            <TestTableStatus
              status={value ?? 'todo'}
              testId={item.objectId}
              change={() => tableActionRef.current.refresh()}
            />
          );
        },
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <DropDownButton
            buttonProps={{ type: 'text' }}
            menuList={[
              {
                title: '删除',
                onClick() {
                  removeTestRelation([record.testRelationId]);
                },
              },
            ]}
          >
            <EllipsisOutlined />
          </DropDownButton>
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
      {
        title: '新增测试用例',
        onClick() {
          createTestDetail();
        },
      },
    ];
  }, [createTestDetail]);

  // 添加测试用例添加到测试执行
  const addTestDetailToPlan = React.useCallback(
    async testDetailIds => {
      // await addTestDetailToPlanService({
      //   testPlan: testEntity,
      //   testDetailIds,
      // });
      if (testDetailIds.length) {
        message.info('后台添加中...');
        addTestRunToExecution({
          testExecution: testEntity,
          testDetailIds: testDetailIds,
        });
      } else {
        message.info('后台添加中...');
        addTestRunToExecution({
          testExecution: testEntity,
          testDetailIds: ['Zk9hORRAQN'],
        });
      }

      // console.log('testEntity', testEntity.toJSON());
      // console.log('testDetailIds', testDetailIds);

      // tableActionRef.current.refresh();
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
      <Space>
        <DropDownButton menuList={testDetailMenuList}>
          添加测试用例 <DownOutlined />
        </DropDownButton>
      </Space>
      <PanelTable
        actionRef={tableActionRef}
        actionMenuList={[
          {
            title: '删除',
            onClick(rows) {
              removeTestRelation(rows.map(row => row.testRelationId));
            },
          },
        ]}
        rowKey="objectId"
        columns={tableColumns}
        getDataSource={tableDataSourceGetter}
      />
    </div>
  );
};

export default React.memo(Test);
