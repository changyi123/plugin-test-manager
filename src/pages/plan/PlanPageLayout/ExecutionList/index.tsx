/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect } from 'react';
import { useRequest } from 'ahooks';
import { deleteTestEntities, getTestEntitiesByRelationWithOrder } from '@/lib/api/common';
import { TestRelationType } from '@/lib/constants';
import { Dropdown, Menu, Spin, Tabs } from 'antd';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import { deleteItems } from '@/lib/api/proxima';
import { useLocation } from 'react-router-dom';
import { usePageContext } from '../../hook';

import cx from './index.less';

interface ExcetionListProps {
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

const ExecutionList: React.FC<ExcetionListProps> = ({
  planId,
  activedType,
  workspaceKey,
  selectedExecution,
  setSelectedExecution,
  refreshExecution,
  setRefreshExecution,
}) => {
  const { tableSelectionToggleEvent } = usePageContext();
  const { query } = useLocation();

  const { data, refresh, loading } = useRequest(
    async () => {
      if (activedType !== 'TestExecution') return [];
      const { list } = await getTestEntitiesByRelationWithOrder(
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

      return list;
    },
    {
      refreshDeps: [planId, activedType],
    },
  );

  useEffect(() => {
    if (!selectedExecution?.objectId && query?.executionId) {
      setSelectedExecution(data.find(d => d.objectId === query?.executionId));
    }
  }, [query?.executionId, selectedExecution]);

  useEffect(() => {
    if (refreshExecution) {
      refresh();
      setRefreshExecution(false);
    }
  }, [refreshExecution]);

  useEffect(() => {
    if (data?.length) {
      setSelectedExecution(data[0]);
    }
  }, [data, planId]);

  const menuClick = (type: string, data) => {
    if (type === 'check') {
      openItemViewScreen(data.objectId);
    }
    if (type === 'delete') {
      actionConfirm('该操作会将该测试执行任务删除，是否继续操作？', async () => {
        await Promise.all([
          deleteTestEntities([data?.objectId]),
          deleteItems([data.reference.objectId]),
        ]);
        setSelectedExecution(undefined);
        setRefreshExecution(true);
      });
    }
  };

  const menu = data => (
    <Menu onClick={e => menuClick(e.key, data)}>
      <Menu.Item key="check">查看任务</Menu.Item>
      <Menu.Item key="delete">删除任务</Menu.Item>
    </Menu>
  );

  return (
    <div className={cx('tab-list')}>
      {activedType === 'TestExecution' && (
        <Spin spinning={loading}>
          {data?.length ? (
            <Tabs
              defaultActiveKey={selectedExecution?.objectId}
              onChange={val => {
                tableSelectionToggleEvent.emit(false);
                setSelectedExecution(data.find(d => d.objectId === val));
              }}
            >
              {data.map(d => (
                <TabPane
                  key={d.objectId}
                  tab={
                    <Dropdown overlay={menu(d)}>
                      <div onClick={e => e.preventDefault()}>{d.reference.name}</div>
                    </Dropdown>
                  }
                />
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
