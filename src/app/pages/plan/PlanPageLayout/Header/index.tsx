import React from 'react';
import { Button, notification, Spin } from 'antd';
import { ArrowLeftOutlined, ExportOutlined } from '@/icons';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import { useBaseAction } from '@/lib/hooks/useContext';
import { createTestExecutionAndRelations } from '@/lib/api/runs';
import { TestType } from '@/lib/constants';
import ExecutionList from '../ExecutionList';
import { usePageContext } from '../../hook';
import WordReport from '@/lib/report';
import { getFirstWordTemplate } from '@/lib/api/report';

import cx from './index.less';

interface HeaderProps {
  activedType?: string;
  setActivedType?: (val: string) => void;
  selectedExecution?: Record<string, any>;
  setSelectedExecution?: (val: Record<string, any> | undefined) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
  setLoading?: (val: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  activedType,
  setActivedType,
  selectedExecution,
  setSelectedExecution,
  refreshExecution,
  setRefreshExecution,
  setLoading,
}) => {
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan, tableSelectionToggleEvent } =
    usePageContext();
  const { createItemUseModal } = useBaseAction();
  const [isReportGenerating, setIsReportGenerating] = React.useState(false);

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

  const generateReport = async () => {
    // TODO: 选取测试报告，当前只取系统第一个
    try {
      setIsReportGenerating(true);
      const wordTemplate = await getFirstWordTemplate();
      const wordTemplateGenerator = new WordReport(wordTemplate);
      await wordTemplateGenerator.generateReport({
        fileName: `${selectedTestPlan.reference.name}-测试报告`,
        testPlanIds: [selectedTestPlan?.objectId],
      });
    } catch (err) {
      // TODO: 错误处理
    } finally {
      setTimeout(() => {
        setIsReportGenerating(false);
      }, 200);
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
            <div className={cx('tab-extra-action')}>
              <Button
                onClick={generateReport}
                icon={<ExportOutlined />}
                loading={isReportGenerating}
              >
                生成测试报告
              </Button>
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
