import React from 'react';
import _ from 'lodash';
import { useRequest } from 'ahooks';
import { getTestEntities } from '@/lib/api/common';
import { StatusBadge } from '@/components/common/Status';
import useMergedState from 'rc-util/lib/hooks/useMergedState';
import { Button, Checkbox, Collapse, Tabs, message } from '@osui/ui';
import { updateTestRun, getTestStepsByTestDetailId } from '@/lib/api/runs';
import { TabsComponentBaseProps } from './type';

import TestStep from './TestStep';

import cx from './TestRun.less';

// 测试执行详情 tabs
const TestRunDetailTabs = [
  {
    title: '用例步骤',
    key: 'step',
    component: TestStep,
  },
  {
    title: '关联事项',
    key: 'itemLink',
    component: null,
  },
  {
    title: '缺陷',
    key: 'defect',
    component: null,
  },
];

type TestRunType = {
  id: string;
  /** 测试执行序列 */
  idSequence?: string[];
};

const TestRun: React.FC<TestRunType> = props => {
  const { idSequence } = props;
  const [autoNext, setAutoNext] = React.useState(false);
  const [testId, setTestId] = useMergedState('', {
    value: props.id,
  });

  const {
    loading,
    data: testRunEntity,
    refresh: refreshTestRun,
  } = useRequest(
    async () => {
      const data = await getTestEntities(
        { id: testId },
        { include: ['runReferenceDetail.reference'] },
      );
      return data?.[0];
    },
    {
      ready: Boolean(testId),
      refreshDeps: [testId],
    },
  );

  // 测试执行数据
  const testRunData = React.useMemo(() => {
    return testRunEntity?.toJSON() ?? {};
  }, [testRunEntity]);

  // 测试执行关联的测试用例
  const refTestDetailData = React.useMemo(() => {
    return testRunData.runReferenceDetail ?? {};
  }, [testRunData]);

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

  const TabPaneChildrenProps = React.useMemo(() => {
    return {
      testRunData,
      testRunEntity,
      refTestDetailData,
    } as TabsComponentBaseProps;
  }, [refTestDetailData, testRunData, testRunEntity]);

  const nextTestRun = React.useCallback(() => {}, []);

  const renderTabTitle = tab => {
    const numGetters = {
      step() {
        return testRunData.runDetail?.steps?.length ?? 0;
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

  return (
    <div className={cx('test-run')}>
      <div className={cx('header')}>
        <div>
          <h6 className={cx('title')}>{refTestDetailData.reference?.name}</h6>
          {canExecNext ? (
            <div className={cx('next')}>
              <Button className={cx('next-btn')} loading={loading} onClick={nextTestRun}>
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
          <StatusBadge className={cx('status-btn')} showBg />
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
                  {tab.component && React.createElement(tab.component, TabPaneChildrenProps as any)}
                </Tabs.TabPane>
              ))}
            </Tabs>
          </Collapse.Panel>
        </Collapse>
      </div>
    </div>
  );
};

export default React.memo(TestRun);
