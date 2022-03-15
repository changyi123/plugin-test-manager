import React from 'react';
import DetailTable from './DetailTable';
import { usePageContext } from '../hook';
import ExecutionTable from './ExecutionTable';
import { AppstoreAddOutlined } from '@/icons';
import { createTestRelation } from '@/lib/api/common';
import { useAllRelTestEntities } from '@/lib/hooks/useTest';
import { TestType, TestRelationType } from '@/lib/constants';
import { Tabs, Button, Tooltip, notification, message } from '@osui/ui';
import { createTestExecutionAndRelations } from '@/lib/api/runs';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import TestEntitySelectorModal, { ActionType } from '@/components/business/TestEntitySelectorModal';

import SearchInput from '@/components/business/SearchInput';

import cx from './index.less';

const enum TabKeyEnum {
  testDetailTable = 'testDetailTable',
  testExecutionTable = 'testExecutionTable',
}

const Main = () => {
  const testEntitySelectorRef = React.useRef<ActionType>();
  const [activeKey, setActiveKey] = React.useState(TabKeyEnum.testDetailTable);
  const [value, setValue] = React.useState(''); // 用于回显searchInput的值
  const {
    tableSelectionToggleEvent,
    setSearchValue,
    selectedTestPlanId,
    refresh,
    mutateTestPlanEvent,
  } = usePageContext();
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);
  const { createItemUseModal } = useBaseAction();
  const { workspace } = useTestConfig();

  const { testEntities, mutate } = useAllRelTestEntities(TestRelationType.PlanRelDetail, {
    from: selectedTestPlanId,
  });

  const toggleTableSelection = (visible?: boolean) => {
    visible = typeof visible === 'boolean' ? visible : !tableSelectionVisible;
    tableSelectionToggleEvent.emit(visible);
    setTableSelectionVisible(visible);
  };

  tableSelectionToggleEvent.useSubscription(visible => {
    setTableSelectionVisible(visible);
  });

  const handleSearch = value => {
    setSearchValue(value);
  };

  const createTestExecution = async () => {
    const { testEntity: testExecutionEntity } = await createItemUseModal({
      type: TestType.TestExecution,
    });

    const testExecutionData = testExecutionEntity.toJSON();

    message.loading('测试执行任务正在创建');

    await createTestExecutionAndRelations({
      workspaceKey: workspace.key,
      testPlan: selectedTestPlanId,
      testExecution: testExecutionEntity,
    });

    refresh('detailTable');
    mutate();
    notification.success({
      message: `测试执行任务【${testExecutionData?.reference?.name}】新建成功`,
    });
  };

  const addTestDetail = async () => {
    const testDetailIds = await testEntitySelectorRef.current.open();
    const relations = testDetailIds.map(testPlanId => ({
      relationType: TestRelationType.PlanRelDetail,
      from: selectedTestPlanId,
      to: testPlanId,
    }));
    await createTestRelation(relations);
    refresh();
    mutateTestPlanEvent.emit(selectedTestPlanId);
    notification.success({
      message: '测试用例已成功添加至测试计划中',
    });
  };

  const rightExtraContent = (
    <div className={cx('extra-content')}>
      <SearchInput
        placeholder="请输入标题"
        value={value}
        className={cx('action')}
        onChange={val => {
          setValue(val as unknown as string);
        }}
        onSearch={handleSearch}
      />
      <Tooltip title="多选操作">
        <AppstoreAddOutlined
          onClick={() => toggleTableSelection()}
          className={cx('action', 'selection', tableSelectionVisible && 'active')}
        />
      </Tooltip>
      {/* <Button className={cx('action')}>导入导出</Button> */}
      {activeKey === TabKeyEnum.testDetailTable ? (
        <>
          <span className={cx('line')} />
          <Button type="primary" onClick={addTestDetail} className={cx('action')}>
            规划用例
          </Button>
          <Button type="primary" onClick={createTestExecution} className={cx('action')}>
            新建测试任务
          </Button>
        </>
      ) : null}
    </div>
  );
  return (
    <>
      <TestEntitySelectorModal
        title="选择规划的测试用例"
        testType={TestType.TestDetail}
        actionRef={testEntitySelectorRef}
        ignoreTestEntityIds={testEntities}
      />
      <Tabs
        activeKey={activeKey}
        destroyInactiveTabPane
        className={cx('tabs')}
        onChange={key => {
          setActiveKey(key as TabKeyEnum);
          toggleTableSelection(false);
          handleSearch('');
          setValue('');
        }}
        tabBarExtraContent={{ right: rightExtraContent }}
      >
        <Tabs.TabPane key={TabKeyEnum.testDetailTable} tab="全部用例">
          <DetailTable />
        </Tabs.TabPane>
        <Tabs.TabPane key={TabKeyEnum.testExecutionTable} tab="测试执行任务">
          <ExecutionTable />
        </Tabs.TabPane>
      </Tabs>
    </>
  );
};

export default React.memo(Main);
