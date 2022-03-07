import React from 'react';
import { Tabs, Button } from '@osui/ui';
import DetailTable from './DetailTable';
import { usePageContext } from '../hook';
import ExecutionTable from './ExecutionTable';
import { AppstoreAddOutlined } from '@/icons';

import SearchInput from '@/components/plan/SearchInput';

import cx from './index.less';

const Main = () => {
  const { tableSelectionToggleEvent, setSearchValue } = usePageContext();
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);

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

  const createTestExecution = () => {
    alert('TODO: 新建测试执行任务');
  };

  const addTestDetail = () => {
    alert('TODO: 规划用例');
  };

  const rightExtraContent = (
    <div className={cx('extra-content')}>
      <SearchInput placeholder="请输入标题" className={cx('action')} onSearch={handleSearch} />
      <AppstoreAddOutlined
        onClick={() => toggleTableSelection()}
        className={cx('action', 'selection', tableSelectionVisible && 'active')}
      />
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
