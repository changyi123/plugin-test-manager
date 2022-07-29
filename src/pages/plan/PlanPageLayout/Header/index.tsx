import React from 'react';
import { Button, notification, Spin } from 'antd';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useBaseAction } from '@/lib/hooks/useContext';
import { createTestExecutionAndRelations } from '@/lib/api/runs';
import { TestType } from '@/lib/constants';
import ExecutionList from '../ExecutionList';
import ExecutionStatus from '../ExecutionStatus';
import { usePageContext } from '../../hook';

import cx from './index.less';

interface HeaderProps {
  activedType?: string;
  setActivedType?: (val: string) => void;
  selectedExecution?: Record<string, any>;
  setSelectedExecution?: (val: Record<string, any> | undefined) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
  setCurTestRuns?: (val: Record<string, any>[] | undefined) => void;
  setLoading?: (val: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  activedType,
  setActivedType,
  selectedExecution,
  setSelectedExecution,
  refreshExecution,
  setRefreshExecution,
  setCurTestRuns,
  setLoading,
}) => {
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan, tableSelectionToggleEvent } =
    usePageContext();
  const { createItemUseModal } = useBaseAction();

  // 创建测试执行任务
  const createTestExecution = async () => {
    const { testEntity: testExecutionEntity } = await createItemUseModal({
      type: TestType.TestExecution,
      extraData: { planId: selectedTestPlan?.objectId },
    });

    try {
      notification.open({
        message: '测试执行任务正在创建中',
        icon: <Spin spinning={true} />,
        duration: null,
      });
      const testExecutionData = testExecutionEntity.toJSON();

      await createTestExecutionAndRelations({
        workspaceKey: workspaceKey,
        testPlan: selectedTestPlan?.objectId,
        testExecution: testExecutionEntity,
      });

      notification.destroy();
      notification.success({
        message: `测试执行任务【${testExecutionData?.reference?.name}】新建成功`,
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
    <>
      <div className={cx('page-header')}>
        <div className={cx('header-left')}>
          <ArrowLeftOutlined
            className={cx('icon')}
            onClick={() => setSelectedTestPlan(undefined)}
          />
          <TestPlanSelector />
          <div className={cx('test-tabs')}>
            <div
              className={cx('tab-title', activedType === 'TestPlan' ? 'actived' : '')}
              onClick={() => {
                tableSelectionToggleEvent.emit(false);
                setActivedType('TestPlan');
              }}
            >
              全部用例
            </div>
            <div
              className={cx('tab-title', activedType === 'TestExecution' ? 'actived' : '')}
              onClick={() => {
                tableSelectionToggleEvent.emit(false);
                setActivedType('TestExecution');
              }}
            >
              测试执行任务
            </div>
          </div>
        </div>
      </div>
      {activedType === 'TestExecution' && (
        <div className={cx('action-box')}>
          <ExecutionList
            planId={selectedTestPlan?.objectId}
            activedType={activedType}
            workspaceKey={workspaceKey}
            selectedExecution={selectedExecution}
            setSelectedExecution={setSelectedExecution}
            refreshExecution={refreshExecution}
            setRefreshExecution={setRefreshExecution}
            setLoading={setLoading}
          />
          {selectedExecution?.objectId && (
            <div className={cx('box-right')}>
              <div className={cx('rate')}>
                <ExecutionStatus
                  selectedExecution={selectedExecution}
                  setCurTestRuns={setCurTestRuns}
                />
              </div>
              <Button type="primary" onClick={createTestExecution}>
                新建测试执行任务
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
export default Header;
