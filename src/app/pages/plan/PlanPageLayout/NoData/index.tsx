import React from 'react';
import { Button, Empty, notification, Spin } from 'antd';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from 'common/constant';
import { createTestExecutionAndRelations } from '@/lib/api/runs';
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
    const { testEntity: testExecutionEntity } = await createItemUseModal({
      type: TestType.Execution,
      extraData: { planId: selectedTestPlan?.objectId },
    });

    try {
      notification.open({
        message: '测试执行任务正在创建中',
        icon: <Spin spinning={true} />,
        duration: null,
      });
      const testExecutionData = testExecutionEntity;

      await createTestExecutionAndRelations({
        workspaceKey: workspaceKey,
        testPlan: selectedTestPlan?.objectId,
        testExecution: testExecutionEntity,
      });

      notification.destroy();
      notification.success({
        message: `测试执行任务【${testExecutionData?.name}】新建成功`,
      });
      setRefreshExecution(true);
    } catch (err) {
      notification.error({
        message: '测试执行任务新建失败',
      });
      notification.destroy();
    }
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
