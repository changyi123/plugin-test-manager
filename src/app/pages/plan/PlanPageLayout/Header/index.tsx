import React, { useMemo } from 'react';
import { Button, Dropdown, Menu } from 'antd';
import { ArrowLeftOutlined, DownOutlined, ExportOutlined } from '@/icons';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import ExecutionList from '../ExecutionList';
import { usePageContext } from '../../hook';
import WordReport from '@/lib/report';
import { useRequest } from 'ahooks';

import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import { getFirstWordTemplate } from '@/lib/api/report';
import { TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

type ExecutionListRef = {
  refresh?: () => void;
};

interface HeaderProps {
  activeType?: string;
  setActiveType?: (val: string) => void;
  selectedExecution?: Record<string, any>;
  setSelectedExecution?: (val: Record<string, any> | undefined) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
  createTestExecution?: (val?: boolean) => void;
  setLoading?: (val: boolean) => void;
  planLinkCaseIds?: string[];
  executionListRef?: React.MutableRefObject<ExecutionListRef>;
  addExistedTestExecution?: () => void;
  selectorModalRef?: React.MutableRefObject<SelectorActionType>;
}

const Header: React.FC<HeaderProps> = ({
  activeType,
  setActiveType,
  selectedExecution,
  setSelectedExecution,
  createTestExecution,
  addExistedTestExecution,
  setLoading,
  executionListRef,
  selectorModalRef,
}) => {
  const { t } = useI18n();
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan, tableSelectionToggleEvent } =
    usePageContext();
  const { getCreatePermission, testExecutionFieldKeys } = useBaseAction();
  const [isReportGenerating, setIsReportGenerating] = React.useState(false);
  const [executionKeys, setExecutionKeys] = React.useState<string[]>([]);

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

  const itemsList = useMemo(
    () => (
      <Menu>
        <Menu.Item key="create" disabled={getCreatePermission(TestType.Execution)}>
          <a onClick={() => createTestExecution()}>{t('common.createTestExecution')}</a>
        </Menu.Item>
        <Menu.Item key="link" disabled={getCreatePermission(TestType.Execution)}>
          <a onClick={addExistedTestExecution}>
            {t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
          </a>
        </Menu.Item>
      </Menu>
    ),
    [addExistedTestExecution, createTestExecution, getCreatePermission, t],
  );

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
            actionRef={executionListRef}
            planId={selectedTestPlan?.objectId}
            activeType={activeType}
            workspaceKey={workspaceKey}
            selectedExecution={selectedExecution}
            setSelectedExecution={setSelectedExecution}
            setLoading={setLoading}
            setExecutionKeys={setExecutionKeys}
          />
          {selectedExecution?.objectId && (
            <div>
              <Dropdown.Button
                type="primary"
                onClick={() => createTestExecution()}
                icon={<DownOutlined />}
                overlay={itemsList}
                trigger={['hover']}
              >
                {t('common.addTestExecution')}
              </Dropdown.Button>
              <TestEntitySelectorModal
                actionRef={selectorModalRef}
                title={t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
                ignoreTestEntityIds={executionKeys}
                tableFieldsKeys={testExecutionFieldKeys}
                width={800}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};
export default Header;
