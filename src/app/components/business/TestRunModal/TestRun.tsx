import { useRequest, useSessionStorageState } from 'ahooks';
import { Button, Checkbox, Collapse, message, Spin, Tabs, Tooltip } from 'antd';
import _ from 'lodash';
import React from 'react';

import { StatusBadge, StatusList } from '@/components/business/Status';
import { QuestionCircleFilled } from '@/icons';
import { getTestEntityByQuery, updateTestRunDetail } from '@/lib/api/item';
import { getItemByIds } from '@/lib/api/proxima';
import { getItemLinkRelation, getTestStepsByTestDetailId } from '@/lib/api/runs';
import { PASS_STATUS_TYPE, TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { useCanExecuteTestRunIdSequence } from '@/lib/hooks/useTest';
import { TestEntity } from '@/lib/types/Test';
import { generateStorageKey, getRootContainer } from '@/lib/utils/helper';

import AttachmentUpload from './AttachmentUpload';
import DefectList from './DefectList';
import ExecutionEditor from './ExecutionEditor';
import ItemLinkTable from './ItemLinkTable';
// import TestComment from './TestComment';
import cx from './TestRun.less';
import TestStep from './TestStep';

// TODO: 类型问题
type TestRunEntity = TestEntity<TestType.Run> | any;
type TestDetailEntity = TestEntity<TestType.Case>;

type TestRunType = {
  id: string;
  /** 测试执行序列 */
  idSequence?: string[];
  selectedTestPlanId?: string; // 当前测试计划 ID
};

const TEST_RUN_AUTO_NEXT_KEY = 'test-run-auto-next';

const TestRun: React.FC<TestRunType> = props => {
  const { t } = useI18n();

  // 测试执行详情 tabs
  const TestRunDetailTabs = [
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
  const { idSequence = [], selectedTestPlanId } = props;
  const [autoNext, setAutoNext] = useSessionStorageState(
    generateStorageKey(TEST_RUN_AUTO_NEXT_KEY),
    {
      defaultValue: false,
    },
  );
  // 子组件 loading
  const [tabPaneLoading, setTabPaneLoading] = React.useState(false);
  const [testId, setTestId] = React.useState(props.id);
  const modelScrollRef = React.useRef();
  const [tabActiveKey, setTabActiveKey] = React.useState(TestRunDetailTabs[0]?.key);

  const {
    data: testRunEntity,
    refresh: refreshTestRun,
    loading: testRunRequestLoading,
  } = useRequest(
    async () => {
      if (!testId) return null;
      const { list: runData } = await getTestEntityByQuery({
        query: {
          id: [testId],
          type: TestType.Run,
        },
      });

      return runData[0];
    },
    {
      ready: Boolean(testId),
      refreshDeps: [testId],
      loadingDelay: 400,
    },
  );

  // 获得可执行的测试执行 id 序列
  const { canExecuteTestRunIdSequence } = useCanExecuteTestRunIdSequence({
    workspaceKey: testRunEntity?.workspace.key,
    idSequence,
  });

  const { data: testCaseEntity } = useRequest(
    async () => {
      if (!testRunEntity?.referenceCase) return null;
      const { list: caseData } = await getTestEntityByQuery({
        query: {
          id: [testRunEntity.referenceCase],
          type: TestType.Case,
        },
      });

      return caseData?.[0];
    },
    {
      ready: Boolean(testRunEntity?.referenceCase),
      refreshDeps: [testRunEntity?.referenceCase],
    },
  );

  // 能否可执行下一个执行, id 不存在 canExecuteTestRunIdSequence 或 已到最后一条不可执行
  const canExecNext =
    Array.isArray(canExecuteTestRunIdSequence) &&
    ![-1, canExecuteTestRunIdSequence.length - 1].includes(
      canExecuteTestRunIdSequence.indexOf(testId),
    );

  // 执行下一个测试用例
  const nextTestRun = React.useCallback(() => {
    const nextIndex = canExecuteTestRunIdSequence.indexOf(testId) + 1;
    if (!canExecNext || nextIndex === canExecuteTestRunIdSequence.length) {
      return message.warning(t('components.business.testRunModal.testRun.runTips'));
    }

    console.info('canExecuteTestRunIdSequence', canExecuteTestRunIdSequence, nextIndex);
    setTestId(canExecuteTestRunIdSequence[nextIndex]);
  }, [canExecuteTestRunIdSequence, testId, setTestId, canExecNext, t]);

  const handleStatusChange = React.useCallback(
    async (status, isStepChange = false) => {
      if (!isStepChange) {
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
      refreshTestRun();
    },
    [autoNext, canExecNext, nextTestRun, refreshTestRun, selectedTestPlanId, testRunEntity, t],
  );

  // 测试执行数据
  const testRunData = React.useMemo(() => {
    return (testRunEntity ?? {}) as TestRunEntity;
  }, [testRunEntity]);

  // 测试执行关联的测试用例事项
  const refTestDetailData = React.useMemo(() => {
    return (testCaseEntity ?? {}) as TestDetailEntity;
  }, [testCaseEntity]);

  // TODO: 类型问题
  // 关联的缺陷 id
  const allRelationDefectIds = (_.chain(testRunData?.runDetail?.steps) as unknown as any[])
    .reduce((acc, step) => {
      return acc.concat(step.defectItemIds);
    }, testRunData?.runDetail?.defectItemIds ?? [])
    .sort()
    .filter(Boolean)
    .uniq()
    .value();

  // 所有关联的缺陷事项
  const { data: allRelationDefectItems } = useRequest(
    async () => (allRelationDefectIds.length ? getItemByIds(allRelationDefectIds) : []),
    {
      ready: Boolean(allRelationDefectIds.length),
      refreshDeps: [allRelationDefectIds.toString()],
    },
  );

  // 事项关联
  const { data: itemLinks } = useRequest(
    async () => {
      if (!refTestDetailData?.objectId) return [];
      const res = await getItemLinkRelation(refTestDetailData.objectId);
      // // 过滤掉 destination 为空（被关联方事项已经被删除）
      return res.filter(item => item.destination);
    },
    {
      ready: Boolean(refTestDetailData?.objectId),
      refreshDeps: [refTestDetailData?.objectId],
    },
  );

  // 所有已关联的缺陷
  const allRelationDefects = React.useMemo(() => {
    const { runDetail } = testRunData ?? {};
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
  }, [testRunData, allRelationDefectItems]);

  React.useEffect(() => {
    // 兼容测试执行无 step 情况（测试执行步骤可在执行阶段创建）
    if (
      testId &&
      testRunData &&
      !testRunData?.runDetail?.precondition &&
      !Array.isArray(testRunData?.runDetail?.steps)
    ) {
      (async () => {
        if (!refTestDetailData?.objectId && !testRunEntity?.objectId) return;
        const detail = refTestDetailData?.detail;
        if (!detail?.steps?.length && !detail?.precondition) return;
        const steps = await getTestStepsByTestDetailId(refTestDetailData?.objectId);
        if (!refTestDetailData.detail?.precondition && !steps?.length) return;
        try {
          const res = await updateTestRunDetail(
            testRunEntity,
            {
              steps: steps,
              runDetail: {
                precondition: detail?.precondition ?? '',
              },
            },
            {
              // 初始化更新
              initialization: true,
            },
          );
          if (res.status === 'error') {
            message.error(res.data);
            return;
          }
          refreshTestRun();
        } catch (err) {
          message.error(err.message);
        }
      })();
    }
  }, [testId, testRunData, refreshTestRun, testRunEntity, refTestDetailData]);

  const onDataChange = React.useCallback(() => {
    refreshTestRun();
    setTabPaneLoading(false);
  }, [refreshTestRun]);

  const onLoading = React.useCallback((loading = true) => {
    setTabPaneLoading(loading);
  }, []);

  const TabItemsProps = React.useMemo(() => {
    const renderTabLabel = tab => {
      const numGetters = {
        step() {
          return testRunData?.runDetail?.steps?.length ?? 0;
        },
        itemLink() {
          return itemLinks?.length ?? 0;
        },
        defect() {
          return allRelationDefects?.length ?? 0;
        },
        attachment() {
          return testRunData?.runDetail?.attachments?.length ?? 0;
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
    };

    const props = {
      itemLinks,
      onLoading,
      testRunData,
      onDataChange,
      testRunEntity,
      refTestDetailData,
      allRelationDefects,
      selectedTestPlanId,
      handleStatusChangeBySteps: handleStatusChange, // 监听步骤 steps 执行 handleStatusChange
    };

    return TestRunDetailTabs.map(tab => ({
      key: tab.key,
      label: renderTabLabel(tab),
      children: React.createElement(tab.component, { ...props, name: tab.key } as any),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    allRelationDefects,
    handleStatusChange,
    itemLinks,
    onDataChange,
    onLoading,
    refTestDetailData,
    selectedTestPlanId,
    testRunData,
    testRunEntity,
  ]);

  // const TestCommentsList = React.useMemo(
  //   () => (
  //     <TestComment
  //       testRunEntity={testRunEntity}
  //       testRunData={testRunData}
  //       onDataChange={onDataChange}
  //       modelScrollRef={modelScrollRef}
  //     />
  //   ),
  //   [testRunEntity, testRunData, onDataChange, modelScrollRef],
  // );

  const loading = tabPaneLoading || testRunRequestLoading;

  return (
    <div ref={modelScrollRef}>
      <Spin spinning={loading}>
        <div className={cx('test-run')} data-element-id="test-run-container">
          <div className={cx('header')}>
            <h6 className={cx('title')}>{testRunData?.name ?? ''}</h6>
            <div>
              <div className={cx('left')}>
                <StatusBadge
                  showBg
                  className={cx('status-btn')}
                  status={testRunData.status}
                  readonly
                  hideIcon
                />
                <div className={cx('status-divider')}>
                  <StatusList onStatusChange={handleStatusChange} status={testRunData.status} />
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
            <Collapse className={cx('collapse')} defaultActiveKey={['1']}>
              <Collapse.Panel
                key="1"
                header={t('components.business.testRunModal.testRun.panelTitle.0')}
              >
                <div className={cx('precondition')}>
                  {testRunData?.runDetail?.precondition ?? t('common.nothing')}
                </div>
              </Collapse.Panel>
            </Collapse>
            <Collapse className={cx('collapse', 'tab')} defaultActiveKey={['1']}>
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
            {/* <Collapse className={cx('collapse')} defaultActiveKey={['1']}>
              <Collapse.Panel key="1" header="评论">
                {TestCommentsList}
              </Collapse.Panel>
            </Collapse> */}
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default React.memo(TestRun);
