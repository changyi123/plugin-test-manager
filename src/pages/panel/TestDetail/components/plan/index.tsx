import React from 'react';
import { ColumnsType } from 'antd/es/table';
import { Menu, Button, Typography, Dropdown } from '@osui/ui';
import { CaretRightOutlined, DownOutlined, DeleteOutlined } from '@ant-design/icons';

import DropDownButton from '@/components/panel/DropDownButton';

import PlanTable from './components/Table';

import cx from './index.less';

const Plan = () => {
  const dropDownMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试计划',
        onClick() {
          console.log(11);
        },
      },
      {
        title: '新建测试计划',
        onClick() {
          console.log(2);
        },
      },
    ];
  }, []);

  return (
    <div className={cx('test-plan')}>
      <DropDownButton menuList={dropDownMenuList}>添加测试用例</DropDownButton>
      <PlanTable />
    </div>
  );
};

export default React.memo(Plan);
