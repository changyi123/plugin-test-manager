import { useMemoizedFn, useRequest, useSessionStorageState } from 'ahooks';
import { Button, Checkbox, Collapse, message, Spin, Tabs, Tooltip } from 'antd';
import _, { clone, keyBy } from 'lodash';
import React from 'react';
import { v4 as uuid } from 'uuid';

import { StatusBadge, StatusList } from '@/components/business/Status';
import { QuestionCircleFilled, UnfoldIcon } from '@/icons';
import { getTestEntityByQuery, updateTestRunDetail } from '@/lib/api/item';
import { getItemByIds } from '@/lib/api/proxima';
import { getItemLinkRelation, getTestStepsByTestDetailId } from '@/lib/api/runs';
import { getAppEnv } from '@/lib/appEnv';
import { PASS_STATUS_TYPE, TestType } from '@/lib/constants';
import { useBaseAction, useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { useCanExecuteTestRunIdSequence } from '@/lib/hooks/useTest';
import { TestEntity } from '@/lib/types/Test';
import { checkRunStatus } from '@/lib/utils/checkRunStatus';
import { generateStorageKey, getRootContainer } from '@/lib/utils/helper';

import AttachmentUpload from './AttachmentUpload';
import DefectList from './DefectList';
import ExecutionEditor from './ExecutionEditor';
import ItemLinkTable from './ItemLinkTable';
import { useSaveTriggerEvent } from './SaveTriggerEvent';
// import TestComment from './TestComment';
import cx from './TestRun.less';
import TestStep from './TestStep';

// TODO: 类型问题
type TestRunEntity = TestEntity<TestType.Run>;
type TestDetailEntity = TestEntity<TestType.Case>;

type TestRunType = {
  id: string;
  /** 测试执行序列 */
  idSequence?: string[];
  selectedTestPlanId?: string; // 当前测试计划 ID
};

const TEST_RUN_AUTO_NEXT_KEY = 'test-run-auto-next';

// 测试执行详情 tabs
const getTestRunDetailTabs = t => [
  {
    title: t('components.business.testRunModal.testRun.tabsTitle.0'),
    key: 'step',
    component: TestStep,
  },
  {
    title: t('components.business.testRunModal.testRun.tabsTitle.1'),
    key: 'resultDesc',
    component: ExecutionEditor,
  },
  {
    title: t('components.business.testRunModal.testRun.tabsTitle.2'),
    key: 'defect',
    component: DefectList,
  },
  {
    title: t('components.business.testRunModal.testRun.tabsTitle.3'),
    key: 'itemLink',
    component: ItemLinkTable,
  },
  {
    title: t('components.business.testRunModal.testRun.tabsTitle.4'),
    key: 'attachment',
    component: AttachmentUpload,
  },
];

const getDefectIds = data =>
  (_.chain(data?.steps) as unknown as any[])
    .reduce((acc, step) => {
      return acc.concat(step.defectItemIds);
    }, data?.defectItemIds ?? [])
    .sort()
    .filter(Boolean)
    .uniq()
    .value();

const TestRun: React.FC<TestRunType> = props => {
  const { t } = useI18n();
  const event = useSaveTriggerEvent();
  const { config } = useTestConfig();
  const { idSequence = [], selectedTestPlanId } = props;
  const [autoNext, setAutoNext] = useSessionStorageState(
    generateStorageKey(TEST_RUN_AUTO_NEXT_KEY),
    {
      defaultValue: false,
    },
  );
  // 子组件 loading
  const [tabPaneLoading, setTabPaneLoading] = React.useState(false);
  const [testRunId, setTestRunId] = React.useState(props.id);
  const modelScrollRef = React.useRef();
  const [tabActiveKey, setTabActiveKey] = React.useState(getTestRunDetailTabs(t)[0]?.key);

  const {
    data: testRunData,
    refresh: refreshTestRunData,
    loading: testRunRequestLoading,
  } = useRequest(
    async () => {
      console.time('初始化测试执行任务耗时：');
      const returnData = {
        testCaseEntity: null,
        testRunEntity: null,
      };

      const getTestRunEntity = async testRunId => {
        const { list: testRunList } = await getTestEntityByQuery({
          query: {
            id: [testRunId],
            type: TestType.Run,
          },
          limit: 1,
        });

        return testRunList[0] as TestRunEntity;
      };

      const getTestCaseEntity = async testCaseId => {
        const { list: testCaseList } = await getTestEntityByQuery({
          query: {
            id: [testCaseId],
            type: TestType.Case,
          },
          limit: 1,
        });
        return testCaseList[0] as TestDetailEntity;
      };

      const testRunEntity = await getTestRunEntity(testRunId);

      returnData.testRunEntity = testRunEntity;

      if (!testRunEntity) return returnData;

      // 增加 testCaseEntity 数据
      returnData.testCaseEntity = {
        objectId: testRunEntity.referenceCase,
      };

      // 未被初始化的测试用例详情字段为 {} 或 null
      if (
        (!testRunEntity.runDetail ||
          !Object.keys(testRunEntity.runDetail).length ||
          testRunEntity.runDetail.init) &&
        !config.enableCaseSnapshot
      ) {
        const testCaseId = testRunEntity.referenceCase;
        const [testCaseEntity, stepsDataFromTestCase] = await Promise.all([
          getTestCaseEntity(testCaseId),
          getTestStepsByTestDetailId(testCaseId),
        ]);

        returnData.testCaseEntity = testCaseEntity;

        // 进一步校验测试执行是否未被初始化
        const testRunIsNotInitial =
          !testRunEntity.runDetail ||
          testRunEntity.runDetail.init ||
          // 测试任务的前置条件或步骤没有数据，但是用例前置条件或步骤有数据
          (!testRunEntity.runDetail?.precondition && testCaseEntity.detail?.precondition) ||
          (!Array.isArray(testRunEntity.runDetail?.steps) &&
            Array.isArray(testCaseEntity.detail?.steps));

        // 测试执行进行初始化
        if (testRunIsNotInitial) {
          const stepsData = (stepsDataFromTestCase ?? testCaseEntity.detail.steps ?? []).map(d => ({
            ...d,
            id: uuid(),
          }));
          const preconditionData = testCaseEntity.detail?.precondition ?? '';

          const runDetailData = {
            steps: stepsData,
            precondition: preconditionData,
            init: false,
          };

          console.info('测试执行详情数据', runDetailData);

          // 更新测试执行任务
          await updateTestRunDetail(
            testRunEntity,
            {
              runDetail: runDetailData,
            },
            {
              // 初始化更新
              initialization: true,
            },
          );

          // 修改返回值
          returnData.testRunEntity = {
            ...testRunEntity,
            runDetail: runDetailData,
          };
        }
      }

      console.timeEnd('初始化测试执行任务耗时：');
      return returnData;
    },
    {
      ready: Boolean(testRunId),
      refreshDeps: [testRunId],
    },
  );

  const { testRunEntity, testCaseEntity } = testRunData ?? {};

  // 获得可执行的测试执行 id 序列
  const { canExecuteTestRunIdSequence } = useCanExecuteTestRunIdSequence({
    workspaceKey: testRunEntity?.workspace.key,
    idSequence,
  });

  // 能否可执行下一个执行, id 不存在 canExecuteTestRunIdSequence 或 已到最后一条不可执行
  const canExecNext =
    Array.isArray(canExecuteTestRunIdSequence) &&
    ![-1, canExecuteTestRunIdSequence.length - 1].includes(
      canExecuteTestRunIdSequence.indexOf(testRunId),
    );

  // 执行下一个测试用例
  const nextTestRun = React.useCallback(() => {
    event.emit();
    const nextIndex = canExecuteTestRunIdSequence.indexOf(testRunId) + 1;
    if (!canExecNext || nextIndex === canExecuteTestRunIdSequence.length) {
      return message.warning(t('components.business.testRunModal.testRun.runTips'));
    }

    console.info('canExecuteTestRunIdSequence', canExecuteTestRunIdSequence, nextIndex);
    setTestRunId(canExecuteTestRunIdSequence[nextIndex]);
  }, [event, canExecuteTestRunIdSequence, testRunId, canExecNext, t]);

  const { globalTestConfig } = useBaseAction();

  const statusesConfig = React.useMemo(() => {
    return keyBy(globalTestConfig?.statuses ?? [], 'key');
  }, [globalTestConfig]);

  const handleStatusChange = useMemoizedFn(
    async (status, isStepChange = false) => {
      if (!isStepChange) {
        const checkStep = getAppEnv('CHECK_STEP_FOR_CHANGE_RUN_STATUS');

        if (checkStep) {
          const flag = checkRunStatus(testRunEntity, status, statusesConfig, t);
          if (!flag) {
            return;
          }
        }

        const res = await updateTestRunDetail(testRunEntity, {
          status: status.key,
          planId: selectedTestPlanId,
        });
        if (res.status === 'error') {
          message.error(res.data);
          return;
        }
      }
      // 通过类型状态可自动执行到下一条
      if (status.type === PASS_STATUS_TYPE && autoNext && canExecNext) {
        nextTestRun();
        return message.success(t('components.business.testRunModal.testRun.runSuccessMessage'));
      }
      setTimeout(() => {
        refreshTestRunData();
      }, 350);
    },
    // [autoNext, canExecNext, nextTestRun, refreshTestRun, selectedTestPlanId, testRunEntity, t],
  );

  // 所有关联的缺陷事项
  const { data: allRelationDefectItems } = useRequest(
    async () => {
      if (!testRunEntity?.runDetail) return;
      const defectIds = getDefectIds(testRunEntity?.runDetail);
      if (!defectIds.length) return;
      return getItemByIds(defectIds);
    },
    {
      ready: Boolean(testRunEntity?.runDetail),
      refreshDeps: [testRunEntity?.runDetail],
    },
  );

  // 事项关联
  const { data: itemLinks } = useRequest(
    async () => {
      if (!testCaseEntity?.objectId) return;
      const res = await getItemLinkRelation(testCaseEntity.objectId);
      // // 过滤掉 destination 为空（被关联方事项已经被删除）
      return res?.filter(item => item.destination) ?? [];
    },
    {
      ready: Boolean(testCaseEntity?.objectId),
      refreshDeps: [testCaseEntity?.objectId],
    },
  );

  // 所有已关联的缺陷
  const allRelationDefects = React.useMemo(() => {
    const { runDetail } = testRunEntity ?? {};
    const { defectItemIds = [], steps = [] } = runDetail ?? {};
    const defectItemDict = _.keyBy(allRelationDefectItems, 'objectId');

    const stepDefects = steps.reduce((acc, step) => {
      const stepDefects = step.defectItemIds?.map(id => ({
        itemId: id,
        type: 'step',
        stepId: step.id,
        item: defectItemDict[id],
      }));
      return acc.concat(stepDefects ?? []);
    }, []);

    const globalDefects = defectItemIds.map(id => ({
      itemId: id,
      type: 'global',
      item: defectItemDict[id],
    }));

    return globalDefects.concat(stepDefects).filter(data => data.item);
  }, [testRunEntity, allRelationDefectItems]);

  const onDataChange = useMemoizedFn(() => {
    setTimeout(() => {
      setTabPaneLoading(false);
      refreshTestRunData();
    }, 350);
  });

  const onLoading = useMemoizedFn((loading = true) => {
    setTabPaneLoading(loading);
  });

  const tabItemsProps = React.useMemo(() => {
    if (!itemLinks) return;
    return {
      itemLinks,
      onLoading,
      onDataChange,
      testRunData: clone(testRunEntity),
      testRunEntity,
      refTestDetailData: testCaseEntity,
      allRelationDefects,
      selectedTestPlanId,
      handleStatusChangeBySteps: handleStatusChange, // 监听步骤 steps 执行 handleStatusChange
    };
  }, [
    allRelationDefects,
    handleStatusChange,
    itemLinks,
    onDataChange,
    onLoading,
    testCaseEntity,
    selectedTestPlanId,
    testRunEntity,
  ]);

  const renderTabLabel = useMemoizedFn(tab => {
    const numGetters = {
      step() {
        return testRunEntity?.runDetail?.steps?.length ?? 0;
      },
      itemLink() {
        return itemLinks?.length ?? 0;
      },
      defect() {
        return allRelationDefects?.length ?? 0;
      },
      attachment() {
        return testRunEntity?.runDetail?.attachments?.length ?? 0;
      },
    };

    return (
      <div className={cx('tab-title')}>
        {tab.title}
        {tab.key !== 'resultDesc' && (
          <span className={cx('num')}>{numGetters[tab.key]?.() ?? ''}</span>
        )}
      </div>
    );
  });

  const TabItemsProps = React.useMemo(() => {
    if (!tabItemsProps) return [];
    return getTestRunDetailTabs(t).map(tab => ({
      key: tab.key,
      label: renderTabLabel(tab),
      children: React.createElement(tab.component, { ...tabItemsProps, name: tab.key } as any),
    }));
  }, [t, tabItemsProps, renderTabLabel]);

  const loading = tabPaneLoading || testRunRequestLoading;

  return (
    <div ref={modelScrollRef}>
      <Spin spinning={loading}>
        <div className={cx('test-run')} data-element-id="test-run-container">
          <div className={cx('header')}>
            <h6 className={cx('title')}>{testRunEntity?.name ?? ''}</h6>
            <div>
              <div className={cx('left')}>
                <StatusBadge
                  showBg
                  className={cx('status-btn')}
                  status={testRunEntity?.status}
                  readonly
                  hideIcon
                />
                <div className={cx('status-divider')}>
                  <StatusList onStatusChange={handleStatusChange} status={testRunEntity?.status} />
                </div>
                {/* <div className={cx('assigner')}></div> */}
              </div>
              {canExecNext ? (
                <div className={cx('next')}>
                  <Button
                    onClick={nextTestRun}
                    className={cx('next-btn')}
                    loading={testRunRequestLoading}
                  >
                    {t('components.business.testRunModal.testRun.runNext')}
                  </Button>
                  <div className={cx('auto')} onClick={() => setAutoNext(!autoNext)}>
                    <Checkbox checked={autoNext} />
                    <span className={cx('label')}>
                      {t('components.business.testRunModal.testRun.autoNext')}
                      <Tooltip
                        getPopupContainer={getRootContainer}
                        title={t('components.business.testRunModal.testRun.autoNextTips')}
                      >
                        <QuestionCircleFilled style={{ marginLeft: 6 }} />
                      </Tooltip>
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className={cx('main')}>
            <Collapse
              className={cx('collapse')}
              defaultActiveKey={['1']}
              expandIcon={({ isActive }) => (
                <UnfoldIcon className={cx({ icon: true, 'active-rotate': isActive })} />
              )}
            >
              <Collapse.Panel
                key="1"
                header={t('components.business.testRunModal.testRun.panelTitle.0')}
              >
                <div className={cx('precondition')}>
                  {testRunEntity?.runDetail?.precondition ?? t('common.nothing')}
                </div>
              </Collapse.Panel>
            </Collapse>
            <Collapse
              className={cx('collapse', 'tab')}
              defaultActiveKey={['1']}
              expandIcon={({ isActive }) => (
                <UnfoldIcon className={cx({ icon: true, 'active-rotate': isActive })} />
              )}
            >
              <Collapse.Panel
                key="1"
                header={t('components.business.testRunModal.testRun.panelTitle.1')}
              >
                <Tabs
                  activeKey={tabActiveKey}
                  onChange={setTabActiveKey}
                  className={cx('tabs')}
                  items={TabItemsProps}
                />
              </Collapse.Panel>
            </Collapse>
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default React.memo(TestRun);
