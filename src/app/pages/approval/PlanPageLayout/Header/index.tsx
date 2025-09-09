import { useRequest } from 'ahooks';
import { Button, Dropdown, Menu } from 'antd';
import React, { useMemo } from 'react';

import CreatePermission from '@/components/business/Contianer/CreatePermission';
import TestEntitySelectorModal, {
  ActionType as SelectorActionType,
} from '@/components/business/TestEntitySelectorModal';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import { ArrowLeftOutlined, DownOutlined, ExportOutlined } from '@/icons';
import { getFirstWordTemplate } from '@/lib/api/report';
import { TestType } from '@/lib/constants';
import { useBaseAction } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import WordReport from '@/lib/report';

import { usePageContext } from '../../hook';
// import ExecutionList from '../ExecutionList';
import cx from './index.less';

// type ExecutionListRef = {
//   refresh?: () => void;
// };

interface HeaderProps {
  activeType?: string;
  setActiveType?: (val) => void;
  selectedExecution?: Record<string, any>;
  // setSelectedExecution?: (val: Record<string, any> | undefined) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
  createTestExecution?: (val?: boolean) => void;
  // setLoading?: (val: boolean) => void;
  planLinkCaseIds?: string[];
  // executionListRef?: React.MutableRefObject<ExecutionListRef>;
  addExistedTestExecution?: () => void;
  selectorModalRef?: React.MutableRefObject<SelectorActionType>;
  executionKeys: string[];
  // setExecutionKeys: (val: Record<string, any> | undefined) => void;
}

const Header: React.FC<HeaderProps> = ({
  activeType,
  setActiveType,
  selectedExecution,
  // setSelectedExecution,
  createTestExecution,
  addExistedTestExecution,
  // setLoading,
  // executionListRef,
  selectorModalRef,
  executionKeys,
  // setExecutionKeys,
}) => {
  const { t } = useI18n();
  const { /**workspaceKey,*/ selectedTestApproval, setSelectedTestApproval, tableSelectionToggleEvent } =
    usePageContext();
  const { testExecutionFieldKeys } = useBaseAction();
  const [isReportGenerating, setIsReportGenerating] = React.useState(false);
  // const [executionKeys, setExecutionKeys] = React.useState<string[]>([]);

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
        fileName: `${selectedTestApproval.name}-${t('common.testReport')}`,
        testPlanIds: [selectedTestApproval?.objectId],
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
        <CreatePermission type={TestType.Execution}>
          <Menu.Item key="create">
            <a onClick={() => createTestExecution()}>{t('common.createTestExecution')}</a>
          </Menu.Item>
        </CreatePermission>
        <CreatePermission type={TestType.Execution}>
          <Menu.Item key="link">
            <a onClick={addExistedTestExecution}>
              {t('modules.panel.testPlan.testExecutionPanel.modelTitle')}
            </a>
          </Menu.Item>
        </CreatePermission>
      </Menu>
    ),
    [addExistedTestExecution, createTestExecution, t],
  );

  const renderAddTestExecution = (
    <div>
      <Dropdown.Button
        type="primary"
        onClick={() => createTestExecution()}
        icon={<DownOutlined />}
        dropdownRender={() => itemsList}
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
  )
  return (
    <>
      <div className={cx('page-header')}>
        <div className={cx('header-left')}>
          <ArrowLeftOutlined
            className={cx('icon')}
            onClick={() => {
              setSelectedTestApproval(undefined);
              // setActiveType('TestExecution');
            }}
          />
          {/* <TestPlanSelector /> */}
          <div className={cx('test-tabs')}>
            {/* <div
              className={cx('tab-title', activeType === 'TestExecution' ? 'actived' : '')}
              onClick={() => {
                tableSelectionToggleEvent.emit(false);
                setActiveType('TestExecution');
              }}
            >
              {t('common.testExecution')}
            </div> */}
            <div
              className={cx('tab-title', activeType === 'TestPlan' ? 'actived' : '')}
              onClick={() => {
                tableSelectionToggleEvent.emit(false);
                setActiveType('TestPlan');
              }}
            >
              {t('common.allTestCase')}
            </div>
            {/* {wordTemplate ? (
              <div className={cx('tab-extra-action')}>
                {['TestExecution'].includes(activeType) && selectedExecution?.objectId && renderAddTestExecution}
                <Button
                  onClick={generateReport}
                  icon={<ExportOutlined />}
                  loading={isReportGenerating}
                >
                  {t('common.createTestReport')}
                </Button>
              </div>
            ) : (
              <div className={cx('tab-extra-action')}>
                {['TestExecution'].includes(activeType) && selectedExecution?.objectId && renderAddTestExecution}
              </div>
            )} */}
          </div>
        </div>
      </div>
      {/* {activeType === 'TestExecution' && (
        <div className={cx('action-box')}>
          <ExecutionList
            actionRef={executionListRef}
            planId={selectedTestApproval?.objectId}
            activeType={activeType}
            workspaceKey={workspaceKey}
            selectedExecution={selectedExecution}
            setSelectedExecution={setSelectedExecution}
            setLoading={setLoading}
            setExecutionKeys={setExecutionKeys}
          />
        </div>
      )} */}
    </>
  );
};
export default Header;
