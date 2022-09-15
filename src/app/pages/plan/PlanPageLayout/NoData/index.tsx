import React from 'react';
import { Button, Empty, notification, Spin } from 'antd';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import emptyImg from '@/icons/svg/empty-data.png';
import { usePageContext } from '../../hook';

import cx from './index.less';

interface NoDataProps {
  setRefreshExecution?: (val: boolean) => void;
}

const NoData: React.FC<NoDataProps> = ({ setRefreshExecution }) => {
  const { workspaceKey, selectedTestPlan } = usePageContext();
  const { createItemUseModal } = useBaseAction();

  // 创建测试执行任务
  const createTestExecution = async () => {
    // const { testEntity: testExecutionEntity } = await createItemUseModal({
    //   type: TestType.TestExecution,
    //   extraData: { planId: selectedTestPlan?.objectId },
    // });
    // TODO 创建测试执行，创建测试执行任务和执行关系，创建执行和用例关系
    // try {
    //   notification.open({
    //     message: '测试执行任务正在创建中',
    //     icon: <Spin spinning={true} />,
    //     duration: null,
    //   });
    //   const testExecutionData = testExecutionEntity.toJSON();
    //   await createTestExecutionAndRelations({
    //     workspaceKey: workspaceKey,
    //     testPlan: selectedTestPlan?.objectId,
    //     testExecution: testExecutionEntity,
    //   });

    //   notification.destroy();
    //   notification.success({
    //     message: `测试执行任务【${testExecutionData?.reference?.name}】新建成功`,
    //   });
    //   setRefreshExecution(true);
    // } catch (err) {
    //   notification.error({
    //     message: '测试执行任务新建失败',
    //   });
    //   notification.destroy();
    // }
  };
  return (
    <div className={cx('no-data-box')}>
      <Empty description="暂无测试执行任务" image={emptyImg}>
        <Button type="primary" onClick={createTestExecution}>
          新建测试执行任务
        </Button>
      </Empty>
    </div>
  );
};

export default NoData;
