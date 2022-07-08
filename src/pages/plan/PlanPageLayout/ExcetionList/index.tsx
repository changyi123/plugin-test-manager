/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import { useRequest } from 'ahooks';
import { getTestEntitiesByRelationWithOrder } from '@/lib/api/common';
import { TestRelationType } from '@/lib/constants';
import { Spin, Tabs } from 'antd';

import cx from './index.less';

interface ExcetionListProps {
  planId: string;
  workspaceKey: string;
  activedType: string;
  excetionId?: string;
  selectedExcetion?: Record<string, any>;
  setSelectedExcetion?: (val: Record<string, any>) => void;
  refreshExcetion?: boolean;
  setRefreshExcetion?: (val: boolean) => void;
}

const { TabPane } = Tabs;

const ExcetionList: React.FC<ExcetionListProps> = ({
  planId,
  activedType,
  workspaceKey,
  selectedExcetion,
  setSelectedExcetion,
  refreshExcetion,
  setRefreshExcetion,
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
          select: ['reference'],
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
    if (refreshExcetion) {
      refresh();
      setRefreshExcetion(false);
    }
  }, [refreshExcetion]);

  useEffect(() => {
    if (!selectedExcetion?.objectId && data?.length) {
      setSelectedExcetion(data[0]);
    }
  }, [selectedExcetion, data]);

  return (
    <div className={cx('tab-list')}>
      {activedType === 'excetion' && (
        <Spin spinning={loading}>
          {data?.length ? (
            <Tabs
              defaultActiveKey={selectedExcetion?.objectId}
              onChange={val => setSelectedExcetion(data.find(d => d.objectId === val))}
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

export default ExcetionList;
