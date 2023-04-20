import React from 'react';
import { Button, message, Space } from 'antd';
import { ArrowLeftOutlined, ExportOutlined } from '@/icons';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import ExecutionList from '../ExecutionList';
import { usePageContext } from '../../hook';
import WordReport from '@/lib/report';
import { useRequest } from 'ahooks';
import { getFirstWordTemplate } from '@/lib/api/report';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestLinkType, TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';

import cx from './index.less';
import { getLinkedTestEntityByQuery, updateTestEntity } from '@/lib/api/item';
import { generateSortIndex } from '@/lib/utils/helper';

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
}

const Header: React.FC<HeaderProps> = ({
  activeType,
  setActiveType,
  selectedExecution,
  setSelectedExecution,
  // refreshExecution,
  // setRefreshExecution,
  createTestExecution,
  setLoading,
  planLinkCaseIds,
  executionListRef,
}) => {
  const { t } = useI18n();
  const selectorModalRef = React.useRef<SelectorActionType>();
  const { workspaceKey, selectedTestPlan, setSelectedTestPlan, tableSelectionToggleEvent } =
    usePageContext();
  const { getCreatePermission } = useBaseAction();
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

  const addTestExecutionToPlan = React.useCallback(
    async ids => {
      // 测试计划关联测试执行后需将测试执行任务中的测试执行对应的测试用例关联到测试计划中
      const res = await updateTestEntity(
        ids.map(objectId => ({
          objectId,
          linkType: TestLinkType.ExecutionLinkPlan,
          type: TestType.Execution,
          linkItems: { action: 'add', value: [selectedTestPlan?.objectId] },
          sortIndex: generateSortIndex(),
        })),
      );
      if (res?.status === 'error') {
        message.error(res.data);
        return;
      }

      const { list: runs } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: ids,
        destinationType: TestType.Run,
        select: ['id', 'referenceCase'],
      });

      const runCaseIds = runs?.map(run => run.referenceCase) ?? [];
      const caseIds = runCaseIds.filter(id => !planLinkCaseIds?.includes(id));

      if (caseIds.length) {
        const res = await updateTestEntity(
          caseIds.map(item => ({
            objectId: item,
            linkType: TestLinkType.CaseLinkPlan,
            linkItems: {
              action: 'add',
              value: [selectedTestPlan.objectId],
            },
          })),
        );
        if (res?.status === 'error') {
          message.error(res.data);
          return;
        }
      }
      message.success(
        `${ids.length} ${t('modules.panel.testPlan.testExecutionPanel.addRunToPlanSuccess')}`,
      );
    },
    [workspaceKey, selectedTestPlan?.objectId, planLinkCaseIds, t],
  );

  // 关联测试执行任务到测试计划
  const addExistedTestExecution = React.useCallback(async () => {
    const ids = await selectorModalRef.current.open({
      testType: TestType.Execution,
    });

    await addTestExecutionToPlan(ids);
    executionListRef?.current.refresh();
  }, [addTestExecutionToPlan, executionListRef]);

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
            <>
              <Space className={cx('box-right')}>
                <Button type="primary" onClick={addExistedTestExecution}>
                  {t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
                </Button>
                <Button
                  type="primary"
                  disabled={getCreatePermission(TestType.Execution)}
                  onClick={() => createTestExecution()}
                >
                  {t('common.createTestExecution')}
                </Button>
              </Space>
              <TestEntitySelectorModal
                actionRef={selectorModalRef}
                title={t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
                ignoreTestEntityIds={executionKeys}
              />
            </>
          )}
        </div>
      )}
    </>
  );
};
export default Header;
