import React from 'react';
import { uniqueId } from 'lodash';
import { useRequest } from 'ahooks';
import { TestType, TestRelationType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import { createTestRelation, getTestEntitiesByRelation } from '@/lib/api/common';

import DropDownButton from '@/components/panel/DropDownButton';

import PlanTable from './components/Table';

import cx from './index.less';

const Plan = () => {
  const {
    testEntity,
    config: { itemTypeMap },
  } = useTestConfig();
  const { createItemUseModal } = useBaseAction();

  const { data: testPlanEntities } = useRequest(() =>
    getTestEntitiesByRelation(TestRelationType.PlanRelDetail, { to: testEntity }),
  );

  console.info(
    'testPlanEntity',
    testPlanEntities?.map(item => item.toJSON()),
  );

  const createPlan = React.useCallback(async () => {
    const token = uniqueId('TestPlan');
    const { testEntity: testPlanEntity, extraData } = await createItemUseModal({
      type: TestType.TestPlan,
      extraData: { token },
    });
    // token 不相同则不创建关联
    if (extraData.token !== token) return;
    await createTestRelation([
      {
        relationType: TestRelationType.PlanRelDetail,
        from: testPlanEntity,
        to: testEntity,
      },
    ]);
  }, [createItemUseModal, testEntity]);

  const dropDownMenuList = React.useMemo(() => {
    return [
      {
        title: '已存在的测试计划',
        onClick() {},
      },
      {
        title: '新建测试计划',
        onClick: createPlan,
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
