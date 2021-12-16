import React from 'react';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';

import DropDownButton from '@/components/panel/DropDownButton';

import PlanTable from './components/Table';

import cx from './index.less';

const Plan = () => {
  const {
    testEntity,
    config: { itemTypeMap },
  } = useTestConfig();
  const { createItemUseModal } = useBaseAction();

  const createPlan = React.useCallback(() => {
    console.log(itemTypeMap.TestPlan);
  }, [itemTypeMap]);

  const dropDownMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试计划',
        onClick() {
          createPlan();
        },
      },
      {
        title: '新建测试计划',
        onClick() {},
      },
    ];
  }, [createPlan]);

  return (
    <div className={cx('test-plan')}>
      <DropDownButton menuList={dropDownMenuList}>添加测试用例</DropDownButton>
      <PlanTable />
    </div>
  );
};

export default React.memo(Plan);
