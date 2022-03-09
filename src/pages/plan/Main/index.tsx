import React from 'react';
import DetailTable from './DetailTable';
import { usePageContext } from '../hook';
import { TestType } from '@/lib/constants';
import ExecutionTable from './ExecutionTable';
import { AppstoreAddOutlined } from '@/icons';
import { Tabs, Button, Tooltip, message } from '@osui/ui';
import { createTestExecutionAndRelations } from '@/lib/api/runs';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';

import SearchInput from '@/components/plan/SearchInput';

import cx from './index.less';

const Main = () => {
  const { tableSelectionToggleEvent, setSearchValue, selectedTestPlanId, refresh } =
    usePageContext();
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);
  const { createItemUseModal } = useBaseAction();
  const { workspace } = useTestConfig();

  const toggleTableSelection = () => {
    const visible = !tableSelectionVisible;
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

    await createTestExecutionAndRelations({
      workspaceKey: workspace.key,
      testPlan: selectedTestPlanId,
      testExecution: testExecutionEntity,
    });

    refresh('detailTable');

    message.success(`测试执行任务【${testExecutionData?.reference?.name}】新建成功`);
  };

  const addTestDetail = () => {};

  const rightExtraContent = (
    <div className={cx('extra-content')}>
      <SearchInput placeholder="请输入标题" className={cx('action')} onSearch={handleSearch} />
      <Tooltip title="多选操作">
        <AppstoreAddOutlined
          onClick={() => toggleTableSelection()}
          className={cx('action', 'selection', tableSelectionVisible && 'active')}
        />
      </Tooltip>
      <span className={cx('line')} />
      {/* <Button className={cx('action')}>导入导出</Button> */}
      <Button type="primary" onClick={addTestDetail} className={cx('action')}>
        规划用例
      </Button>
      <Button type="primary" onClick={createTestExecution} className={cx('action')}>
        新建测试任务
      </Button>
    </div>
  );
  return (
    <Tabs
      destroyInactiveTabPane
      className={cx('tabs')}
      tabBarExtraContent={{ right: rightExtraContent }}
    >
      <Tabs.TabPane key="testDetail" tab="全部用例">
        <DetailTable />
      </Tabs.TabPane>
      <Tabs.TabPane key="testExecution" tab="测试执行任务">
        <ExecutionTable />
      </Tabs.TabPane>
    </Tabs>
  );
};

export default React.memo(Main);
