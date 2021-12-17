import React from 'react';

import { useRequest } from 'ahooks';
import { TestRelationType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import { getTestEntitiesByRelation } from '@/lib/api/common';
import DropDownButton from '@/components/panel/DropDownButton';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();

  const { data: testDetailEntities } = useRequest(
    () =>
      getTestEntitiesByRelation(
        TestRelationType.PlanRelDetail,
        { from: testEntity },
        { fillItemData: true },
      ),
    {},
  );

  console.info('testDetailEntities', testDetailEntities);

  // 添加测试用例菜单
  const testDetailMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试用例',
        onClick: () => {
          console.info(11);
        },
      },
    ];
  }, []);

  // 添加测试执行菜单
  const testExecutionMenuList = React.useMemo(() => {
    return [
      {
        title: '所有测试用例',
        onClick: () => {
          console.info('所有测试用例');
        },
      },
    ];
  }, []);

  return (
    <div className={cx('test')}>
      <DropDownButton menuList={testDetailMenuList}>添加测试用例</DropDownButton>
      <DropDownButton buttonProps={{ className: cx('btn-right') }} menuList={testExecutionMenuList}>
        创建测试执行
      </DropDownButton>
    </div>
  );
};

export default React.memo(Test);
