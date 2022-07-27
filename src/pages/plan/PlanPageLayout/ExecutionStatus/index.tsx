/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import { StatusProgress } from '@/components/business/Status';
import { Spin } from 'antd';
import { useRequest } from 'ahooks';
import { TestRelationType } from '@/lib/constants';
import { getTestEntitiesByRelation } from '@/lib/api/common';
import { usePageContext } from '../../hook';

import cx from './index.less';

interface ExecutionStatusProps {
  selectedExecution?: Record<string, any>;
  setCurTestRuns?: (val: Record<string, any>[]) => void;
}

const ExecutionStatus: React.FC<ExecutionStatusProps> = ({ selectedExecution, setCurTestRuns }) => {
  const { workspaceKey, mutateStatusEvent } = usePageContext();
  const { data, refresh, loading } = useRequest(
    async () => {
      if (!selectedExecution?.objectId) return [];

      const { list: testRuns } = await getTestEntitiesByRelation(
        TestRelationType.ExecutionRelRun,
        {
          from: [selectedExecution?.objectId],
        },
        {
          // FIXME: 优化查询速度
          workspaceKey,
          queryParams: { limit: 9999 },
          select: [
            'status',
            'sortIndex',
            'runReferenceDetail.reference',
            'runReferenceDetail.repository',
            'executor',
            'designee',
          ],
          include: [
            'status',
            'sortIndex',
            'runReferenceDetail.reference',
            'runReferenceDetail.repository',
            'executor',
            'designee',
          ],
        },
      );

      const testRunList = testRuns
        // 过滤测试用例事项已被删除的执行
        .filter(run => run.runReferenceDetail?.reference)
        // 对测试用例进行排序
        .sort(
          (a, b) =>
            a.sortIndex - b.sortIndex ||
            Number(new Date(a.createdAt)) - Number(new Date(b.createdAt)),
        );

      return testRunList;
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

  useEffect(() => {
    if (!loading && data) {
      setCurTestRuns(data);
    }
  }, [loading, data]);

  const getRate = (statusData = []) => {
    if (!statusData?.length) return 0;
    const filterStatusByType = type => statusData.filter(d => d === type);
    return Math.floor((filterStatusByType('PASSED').length / statusData.length) * 100);
  };

  const status = data?.map(d => d.status ?? 'TODO') ?? [];

  return (
    <Spin spinning={loading}>
      {data && (
        <div className={cx('complete-rate-box')}>
          <span className={cx('rate')}>执行通过率 {getRate(status)}%</span>
          <div className={cx('progress')}>
            <StatusProgress hasSummary statuses={status} />
          </div>
        </div>
      )}
    </Spin>
  );
};

export default ExecutionStatus;
