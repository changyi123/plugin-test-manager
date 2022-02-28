import React from 'react';
import { Tabs, Button } from '@osui/ui';
import DetailTable from './DetailTable';
import { usePageContext } from '../hook';
import { AppstoreAddOutlined } from '@/icons';

import SearchInput from '@/components/plan/SearchInput';

import cx from './index.less';

const Main = () => {
  const { tableActionEvent, setSearchValue } = usePageContext();
  const [tableSelectionVisible, setTableSelectionVisible] = React.useState(false);

  const toggleTableSelection = () => {
    const visible = !tableSelectionVisible;
    tableActionEvent.emit({ tableSelectionVisible: visible });
    setTableSelectionVisible(visible);
  };

  const handleSearch = value => {
    setSearchValue(value);
  };

  const rightExtraContent = (
    <div className={cx('extra-content')}>
      <SearchInput className={cx('action')} onSearch={handleSearch} />
      <AppstoreAddOutlined
        onClick={() => toggleTableSelection()}
        className={cx('action', 'selection', tableSelectionVisible && 'active')}
      />
      <span className={cx('line')} />
      {/* <Button className={cx('action')}>导入导出</Button> */}
      <Button type="primary" className={cx('action')}>
        规划用例
      </Button>
      <Button type="primary" className={cx('action')}>
        新建测试任务
      </Button>
    </div>
  );
  return (
    <Tabs className={cx('tabs')} tabBarExtraContent={{ right: rightExtraContent }}>
      <Tabs.TabPane key="testDetail" tab="全部用例">
        <DetailTable />
      </Tabs.TabPane>
      <Tabs.TabPane key="testExecution" tab="测试执行任务"></Tabs.TabPane>
    </Tabs>
  );
};

export default React.memo(Main);
