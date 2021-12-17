import React from 'react';

import { useRequest } from 'ahooks';
import { uniqueId } from 'lodash';
import { TestType, TestRelationType } from '@/lib/constants';
import { getTestEntitiesByRelation } from '@/lib/api/common';
import DropDownButton from '@/components/panel/DropDownButton';
import { useTestConfig, useBaseAction } from '@/lib/hooks/useContext';
import { createTestExecutionService } from './services';

import cx from './index.less';

const Test = () => {
  const { testEntity } = useTestConfig();
  const { createItemUseModal } = useBaseAction();

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

  // 创建测试执行
  const createTestExecution = React.useCallback(async () => {
    const token = uniqueId('TestPlan');
    const res = await createItemUseModal({
      extraData: { token },
      // TODO: 测试执行 name
      name: uniqueId('测试执行'),
      type: TestType.TestExecution,
    });

    const { testEntity: testExecutionEntity, extraData } = res;
    // token 不相同则不创建关联
    if (extraData.token !== token) return;

    const testExecution = await createTestExecutionService(testEntity, testExecutionEntity);

    console.info('testExecution', testExecution);
  }, [createItemUseModal, testEntity]);

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
        onClick: createTestExecution,
      },
    ];
  }, [createTestExecution]);

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
