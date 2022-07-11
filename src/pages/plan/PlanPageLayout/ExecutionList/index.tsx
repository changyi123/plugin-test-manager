/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import { useRequest } from 'ahooks';
import { getTestEntitiesByRelationWithOrder } from '@/lib/api/common';
import { TestRelationType } from '@/lib/constants';
import { Spin, Tabs } from 'antd';

import cx from './index.less';

interface ExecutionListProps {
  planId: string;
  workspaceKey: string;
  activedType: string;
  executionId?: string;
  selectedExecution?: Record<string, any>;
  setSelectedExecution?: (val: Record<string, any>) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
}

const { TabPane } = Tabs;

const ExecutionList: React.FC<ExecutionListProps> = ({
  planId,
  activedType,
  workspaceKey,
  selectedExecution,
  setSelectedExecution,
  refreshExecution,
  setRefreshExecution,
}) => {
  const { data, refresh, loading } = useRequest(
    async () => {
      const relationData = await getTestEntitiesByRelationWithOrder(
        TestRelationType.PlanRelExecution,
        {
          from: [planId],
        },
        {
          workspaceKey,
          select: ['reference', 'workspaceKey'],
          include: ['reference'],
          descendingBy: 'createdAt',
        },
      );

      return relationData?.list;
    },
    {
      refreshDeps: [planId],
      staleTime: 999999999,
      cacheTime: 999999999,
    },
  );

  useEffect(() => {
    if (refreshExecution) {
      refresh();
      setRefreshExecution(false);
    }
  }, [refreshExecution]);

  useEffect(() => {
    if (!selectedExecution?.objectId && data?.length) {
      setSelectedExecution(data[0]);
    }
  }, [selectedExecution, data]);

  return (
    <div className={cx('tab-list')}>
      {activedType === 'execution' && (
        <Spin spinning={loading}>
          {data?.length ? (
            <Tabs
              defaultActiveKey={selectedExecution?.objectId}
              onChange={val => setSelectedExecution(data.find(d => d.objectId === val))}
            >
              {data.map(d => (
                <TabPane key={d.objectId} tab={d.reference.name} />
              ))}
            </Tabs>
          ) : (
            '无测试任务'
          )}
        </Spin>
      )}
    </div>
  );
};

export default ExecutionList;
