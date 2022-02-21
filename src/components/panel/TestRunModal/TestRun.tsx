import React from 'react';
import _ from 'lodash';
import { useRequest } from 'ahooks';
import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { TabsComponentBaseProps } from './type';
import { getItemByIQL } from '@/lib/api/proxima';
import { getTestEntities } from '@/lib/api/common';
import { StatusBadge } from '@/components/common/Status';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { Button, Checkbox, Collapse, Tabs, message, Spin } from '@osui/ui';
import { updateTestRun, getTestStepsByTestDetailId, getItemLinkRelation } from '@/lib/api/runs';

import TestStep from './TestStep';
import ItemLinkTable from './ItemLinkTable';
import DefectList from './DefectList';

import cx from './TestRun.less';

// 测试执行详情 tabs
const TestRunDetailTabs = [
  {
    title: '用例步骤',
    key: 'step',
    component: TestStep,
  },
  {
    title: '缺陷',
    key: 'defect',
    component: DefectList,
  },
  {
    title: '关联事项',
    key: 'itemLink',
    component: ItemLinkTable,
  },
];

type TestRunEntity = TestEntity<TestType.TestRun>;
type TestDetailEntity = TestEntity<TestType.TestDetail>;

type TestRunType = {
  id: string;
  /** 测试执行序列 */
  idSequence?: string[];
};

const TestRun: React.FC<TestRunType> = props => {
  const { idSequence } = props;
  const [autoNext, setAutoNext] = React.useState(false);
  // 子组件 loading
  const [tabPaneLoading, setTabPaneLoading] = React.useState(false);
  const [testId, setTestId] = useMergedState('', {
    value: props.id,
  });

  const {
    loading: testRunRequestLoading,
    data: testRunEntity,
    refresh: refreshTestRun,
  } = useRequest(
    async () => {
      const data = await getTestEntities(
        { id: testId },
        { include: ['runReferenceDetail.reference'] },
      );
      return data?.[0] as Parse.Object<TestRunEntity>;
    },
    {
      ready: Boolean(testId),
      refreshDeps: [testId],
    },
  );

  // 测试执行数据
  const testRunData = React.useMemo(() => {
    return testRunEntity?.toJSON() ?? ({} as TestRunEntity);
  }, [testRunEntity]);

  // 测试执行关联的测试用例
  const refTestDetailData = React.useMemo(() => {
    return testRunData.runReferenceDetail ?? ({} as TestDetailEntity);
  }, [testRunData]);

  // 关联的缺陷 id
  const allRelationDefectIds = _.chain(testRunData?.runDetail?.steps)
    .reduce((acc, step) => {
      return acc.concat(step.defectItemIds);
    }, testRunData?.runDetail?.defectItemIds ?? [])
    .sort()
    .uniq()
    .value();

  // 所有关联的缺陷事项
  const { data: allRelationDefectItems, loading: relationDefectsRequestLoading } = useRequest(
    async () => {
      const res = await getItemByIQL({ itemId: allRelationDefectIds });
      return res.items;
    },
    {
      ready: Boolean(allRelationDefectIds.length),
      refreshDeps: [allRelationDefectIds.toString()],
    },
  );

  // 测试用例事项 id
  const refTestDetailItemId = refTestDetailData.reference?.objectId;
  // 事项关联
  const { data: itemLinks, loading: itemLinksRequestLoading } = useRequest(
    () => getItemLinkRelation(refTestDetailItemId),
    {
      ready: Boolean(refTestDetailItemId),
      refreshDeps: [refTestDetailItemId, allRelationDefectIds.toString()],
    },
  );

  // 所有已关联的缺陷
  const allRelationDefects = React.useMemo(() => {
    const { runDetail } = testRunData;
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

    return globalDefects.concat(stepDefects);
  }, [testRunData, allRelationDefectItems]);

  // 能否可执行下一个执行, id 不存在 idSequence 或 已到最后一条不可执行
  const canExecNext =
    true ||
    (Array.isArray(idSequence) && [-1, idSequence.length - 1].includes(idSequence.indexOf(testId)));

  React.useEffect(() => {
    // 兼容测试执行无 step 情况（测试执行步骤可在执行阶段创建）
    if (testId && !Array.isArray(testRunData.runDetail?.steps) && testRunData.runReferenceDetail) {
      (async () => {
        try {
          const steps = await getTestStepsByTestDetailId(testRunData.runReferenceDetail.objectId);
          await updateTestRun(testRunEntity, { steps });
          refreshTestRun();
        } catch (err) {
          message.error(err.message);
        }
      })();
    }
  }, [testId, testRunData, refreshTestRun, testRunEntity]);

  const onDataChange = React.useCallback(() => {
    refreshTestRun();
    setTabPaneLoading(false);
  }, [refreshTestRun]);

  const onLoading = React.useCallback((loading = true) => {
    setTabPaneLoading(loading);
  }, []);

  const TabPaneChildrenProps = React.useMemo(() => {
    return {
      itemLinks,
      onLoading,
      testRunData,
      onDataChange,
      testRunEntity,
      refTestDetailData,
      allRelationDefects,
    } as TabsComponentBaseProps;
  }, [
    itemLinks,
    onLoading,
    testRunData,
    onDataChange,
    testRunEntity,
    refTestDetailData,
    allRelationDefects,
  ]);

  const nextTestRun = React.useCallback(() => {}, []);

  const renderTabTitle = tab => {
    const numGetters = {
      step() {
        return testRunData.runDetail?.steps?.length ?? 0;
      },
      itemLink() {
        return itemLinks?.length ?? 0;
      },
      defect() {
        return allRelationDefectIds?.length ?? 0;
      },
    };

    return (
      <div className={cx('tab-title')}>
        {tab.title}
        {numGetters[tab.key]?.() ? (
          <span className={cx('num')}>{numGetters[tab.key]?.()}</span>
        ) : null}
      </div>
    );
  };

  const loading =
    tabPaneLoading ||
    testRunRequestLoading ||
    relationDefectsRequestLoading ||
    itemLinksRequestLoading;

  return (
    <Spin spinning={loading}>
      <div className={cx('test-run')} data-element-id="test-run-container">
        <div className={cx('header')}>
          <div>
            <h6 className={cx('title')}>{refTestDetailData.reference?.name}</h6>
            {canExecNext ? (
              <div className={cx('next')}>
                <Button
                  onClick={nextTestRun}
                  className={cx('next-btn')}
                  loading={testRunRequestLoading}
                >
                  执行下一条
                </Button>
                <div className={cx('auto')} onClick={() => setAutoNext(!autoNext)}>
                  <Checkbox checked={autoNext} />
                  <span className={cx('label')}>自动切换下一条</span>
                </div>
              </div>
            ) : null}
          </div>
          <div>
            <StatusBadge className={cx('status-btn')} showBg status={testRunData.status} />
            <div className={cx('assigner')}></div>
          </div>
        </div>
        <div className={cx('main')}>
          <Collapse className={cx('collapse')} defaultActiveKey={['1']}>
            <Collapse.Panel key="1" header="前置条件">
              <div className={cx('precondition')}>无</div>
            </Collapse.Panel>
          </Collapse>
          <Collapse className={cx('collapse', 'tab')} defaultActiveKey={['1']}>
            <Collapse.Panel key="1" header="测试执行详情">
              <Tabs className={cx('tabs')}>
                {TestRunDetailTabs.map(tab => (
                  <Tabs.TabPane key={tab.key} tab={(() => renderTabTitle(tab))()}>
                    {tab.component &&
                      React.createElement(tab.component, TabPaneChildrenProps as any)}
                  </Tabs.TabPane>
                ))}
              </Tabs>
            </Collapse.Panel>
          </Collapse>
        </div>
      </div>
    </Spin>
  );
};

export default React.memo(TestRun);
