/* eslint-disable react-hooks/exhaustive-deps */
import { useListener } from '@projectproxima/proxima-sdk-js';
import { useRequest } from 'ahooks';
import { Spin } from 'antd';
import React from 'react';

import { StatusProgress } from '@/components/business/Status';
import { getTestStats } from '@/lib/api/item';
import { BuiltinFieldNameMapping, TestLinkType, TestType } from '@/lib/constants';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { usePageContext } from '@/pages/caseset/components/hook';

import cx from './index.less';

interface ExecutionStatusProps {
  selectedExecution?: Record<string, any>;
}

const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ selectedExecution }) => {
  const { t } = useI18n();
  const { mutateStatusEvent, workspaceKey } = usePageContext();
  const { config } = useTestConfig();
  const { data, refresh, loading } = useRequest(
    async () => {
      if (!selectedExecution?.objectId || !config) return [];
      // 查询测试执行任务状态 统计数据
      const quoteCounts = await getTestStats({
        groups: 'status',
        params: {
          query: {
            workspaceKey: workspaceKey,
            type: TestType.Run,
          },
          selector: config?.enableCaseSnapshot
            ? `${BuiltinFieldNameMapping.referenceCaseSnapshot} is not null`
            : `${BuiltinFieldNameMapping.referenceCase} is not null`,
          linkType: TestLinkType.RunLinkExecution,
          sourceIds: [selectedExecution?.objectId],
          destinationType: TestType.Run,
          limit: 99999,
        } as any,
      });

      return quoteCounts.reduce(
        (prev, cur) => ({
          ...prev,
          [cur.status]: cur.count,
        }),
        {},
      );
    },
    {
      refreshDeps: [selectedExecution, workspaceKey, config?.enableCaseSnapshot],
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
            {t('page.plan.planPageLayout.executionStatus.rate')} {getRate(data)}%
          </span>
          <div className={cx('progress')}>
            <StatusProgress hasSummary status={data} />
          </div>
        </div>
      )}
    </Spin>
  );
};

export default ExecutionStatus;
