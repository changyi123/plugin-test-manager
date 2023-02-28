import React from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined, ExportOutlined } from '@/icons';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import ExecutionList from '../ExecutionList';
import { usePageContext } from '../../hook';
import WordReport from '@/lib/report';
import { useRequest } from 'ahooks';
import { getFirstWordTemplate } from '@/lib/api/report';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

interface HeaderProps {
  activeType?: string;
  setActiveType?: (val: string) => void;
  selectedExecution?: Record<string, any>;
  setSelectedExecution?: (val: Record<string, any> | undefined) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
  createTestExecution?: (val?: boolean) => void;
  setLoading?: (val: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({
  activeType,
  setActiveType,
  selectedExecution,
  setSelectedExecution,
  refreshExecution,
  setRefreshExecution,
  createTestExecution,
  setLoading,
}) => {
  const { t } = useI18n();
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan, tableSelectionToggleEvent } =
    usePageContext();
  const { getCreatePermission } = useBaseAction();
  const [isReportGenerating, setIsReportGenerating] = React.useState(false);

  const { data: wordTemplate } = useRequest(
    async () => {
      return getFirstWordTemplate();
    },
    {
      // 不需要重新获取 wordTemplate
      refreshDeps: [],
    },
  );

  const generateReport = async () => {
    // TODO: 选取测试报告，当前只取系统第一个
    try {
      setIsReportGenerating(true);
      const wordTemplateGenerator = new WordReport(wordTemplate);
      await wordTemplateGenerator.generateReport({
        fileName: `${selectedTestPlan.name}-${t('common.testReport')}`,
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
              className={cx('tab-title', activeType === 'TestPlan' ? 'actived' : '')}
              onClick={() => {
                tableSelectionToggleEvent.emit(false);
                setActiveType('TestPlan');
              }}
            >
              {t('common.allTestCase')}
            </div>
            <div
              className={cx('tab-title', activeType === 'TestExecution' ? 'actived' : '')}
              onClick={() => {
                tableSelectionToggleEvent.emit(false);
                setActiveType('TestExecution');
              }}
            >
              {t('common.testExecution')}
            </div>
            {wordTemplate ? (
              <div className={cx('tab-extra-action')}>
                <Button
                  onClick={generateReport}
                  icon={<ExportOutlined />}
                  loading={isReportGenerating}
                >
                  {t('common.createTestReport')}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {activeType === 'TestExecution' && (
        <div className={cx('action-box')}>
          <ExecutionList
            planId={selectedTestPlan?.objectId}
            activeType={activeType}
            workspaceKey={workspaceKey}
            selectedExecution={selectedExecution}
            setSelectedExecution={setSelectedExecution}
            refreshExecution={refreshExecution}
            setRefreshExecution={setRefreshExecution}
            setLoading={setLoading}
          />
          {selectedExecution?.objectId && (
            <div className={cx('box-right')}>
              <Button
                type="primary"
                disabled={getCreatePermission(TestType.Execution)}
                onClick={() => createTestExecution()}
              >
                {t('common.createTestExecution')}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
export default Header;
