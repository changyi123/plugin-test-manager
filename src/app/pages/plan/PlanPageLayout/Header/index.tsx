import React, { useCallback, useRef, useState } from 'react';
import { Button, notification, Spin } from 'antd';
import { ArrowLeftOutlined, ExportOutlined } from '@/icons';
import TestPlanSelector from '@/components/business/TestPlanSelector';
import { useBaseAction } from '@/lib/hooks/useContext';
import { TestLinkType, TestType } from '@/lib/constants';
import ExecutionList from '../ExecutionList';
import { usePageContext } from '../../hook';
import WordReport from '@/lib/report';
import { useRequest } from 'ahooks';
import { getFirstWordTemplate } from '@/lib/api/report';
import { batchCreateTestRun, updateTestEntity } from '@/lib/api/item';
import { generateSortIndex } from '@/lib/utils/helper';
import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { PROXIMA_EVENT_KEY } from '@/lib/constants';

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
  const testEntitySelectorRef = useRef<ModelActionType>();
  const { createItemUseModal } = useBaseAction();
  const [isReportGenerating, setIsReportGenerating] = React.useState(false);
  const [selectValue, setSelectValue] = useState<string[] | undefined>(undefined);
  const [treeType, setTreeType] = React.useState<string | undefined>('');

  const getSelectCaseIds = useCallback(async () => {
    if (!testEntitySelectorRef.current?.open) return;
    const data = await testEntitySelectorRef.current?.open({
      selectValue,
      treeType,
      modelProps: {
        title: '第 1 步：选择关联用例',
        footer: {
          ok: {
            name: '下一步',
          },
          cancel: {
            name: '取消',
          },
        },
      },
    });
    return data;
  }, [selectValue, treeType]);

  const createExcution = useCallback(
    async (caseIds = []) => {
      const res = await createItemUseModal({
        type: TestType.Execution,
        extraData: {
          planId: selectedTestPlan?.objectId,
          noBatch: true,
          isCreateExecution: true,
          modalProps: {
            title: `第 2 步：新建测试执行任务（已选 ${caseIds.length} 条用例）`,
            footer: {
              cancel: {
                name: '上一步',
              },
            },
          },
        },
      });

      return res;
    },
    [createItemUseModal, selectedTestPlan?.objectId],
  );

  // 创建测试执行任务
  const createTestExecution = useCallback(async () => {
    const data = await getSelectCaseIds();
    if (!data) return;
    const { selectedData: caseIds, treeType } = data;
    setSelectValue(caseIds);
    setTreeType(treeType);
    const { item, extraData } = await createExcution(caseIds);

    // 创建测试执行，创建测试执行任务和执行关系，创建执行和用例关系
    try {
      notification.open({
        message: '测试执行任务正在创建中',
        icon: <Spin spinning={true} />,
        duration: null,
      });

      // 创建完测试执行任务事项，更新测试执行任务关联测试计划
      await updateTestEntity([
        {
          objectId: item.objectId,
          type: TestType.Execution,
          linkType: TestLinkType.ExecutionLinkPlan,
          linkItems: {
            action: 'add',
            value: [extraData?.planId],
          },
          sortIndex: generateSortIndex(),
        },
      ]);

      // 创建测试执行
      if (caseIds.length > 0) {
        await batchCreateTestRun({
          executionId: item.objectId,
          caseIds,
        });
      }

      notification.destroy();
      notification.success({
        message: `测试执行任务【${item.name}】新建成功`,
      });
      setRefreshExecution(true);
    } catch (err) {
      notification.destroy();
      notification.error({
        message: '测试执行任务新建失败',
      });
    }
  }, [createExcution, getSelectCaseIds, setRefreshExecution]);

  const cancelCallback = useCallback(
    async params => {
      if (params?.type === 'previous') {
        await createTestExecution();
      }
    },
    [createTestExecution],
  );

  useListener('ExecutionPrevious', cancelCallback);
  useListener(PROXIMA_EVENT_KEY.itemBatchCreateSuccess, () => {
    setSelectValue([]);
    setTreeType('plan');
  });

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
        fileName: `${selectedTestPlan.name}-测试报告`,
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
            {wordTemplate ? (
              <div className={cx('tab-extra-action')}>
                <Button
                  onClick={generateReport}
                  icon={<ExportOutlined />}
                  loading={isReportGenerating}
                >
                  生成测试报告
                </Button>
              </div>
            ) : null}
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
              <TestEntitySelectorModal
                title="选择规划的测试用例"
                testType={TestType.Case}
                actionRef={testEntitySelectorRef}
                onCancel={() => {
                  setSelectValue([]);
                  setTreeType('plan');
                }}
                planId={selectedTestPlan?.objectId}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};
export default Header;
