/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import { StatusProgress } from '@/components/business/Status';
import { Spin } from 'antd';
import { useRequest } from 'ahooks';
import { usePageContext } from '../../hook';
import { getStatsTestExecution } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import { useListener } from '@projectproxima/proxima-sdk-js';

import cx from './index.less';

interface ExecutionStatusProps {
  selectedExecution?: Record<string, any>;
  setCurTestRuns?: (val: Record<string, any>[]) => void;
}

const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ selectedExecution, setCurTestRuns }) => {
  const { t } = useI18n();
  const { mutateStatusEvent } = usePageContext();
  const { data, refresh, loading } = useRequest(
    async () => {
      if (!selectedExecution?.objectId) return [];
      // 查询测试执行任务状态 统计数据
      const states = await getStatsTestExecution({
        select: ['runStatus'],
        executionIds: [selectedExecution?.objectId],
      });

      return states?.[selectedExecution?.objectId] ?? {};
    },
    {
      refreshDeps: [selectedExecution],
    },
  );

  mutateStatusEvent.useSubscription(key => {
    if (key === 'refreshExecutionStatus') {
      refresh();
    }
  });

  useListener('updateTestRunStatus', () => {
    refresh();
  });

  useEffect(() => {
    if (!loading && data) {
      setCurTestRuns(data);
    }
  }, [loading, data]);

  const getRate = (statusData: Record<string, number>) => {
    const passCount = statusData?.PASSED ?? 0;
    const total = Object.values(statusData ?? {}).reduce((prev: number, cur: number) => {
      prev = prev + cur;
      return prev;
    }, 0);

    const rate = passCount ? passCount / (total as number) : 0;
    return Math.floor(rate * 100);
  };

  return (
    <Spin spinning={loading}>
      {data && (
        <div className={cx('complete-rate-box')}>
          <span className={cx('rate')}>
            {t('page.plan.planPageLayout.executionStatus.rate')} {getRate(data.runStatus)}%
          </span>
          <div className={cx('progress')}>
            <StatusProgress hasSummary status={data.runStatus} />
          </div>
        </div>
      )}
    </Spin>
  );
};

export default ExecutionStatus;
