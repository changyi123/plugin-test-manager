/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { useRequest } from 'ahooks';
import { deleteTestEntities } from '@/lib/api/common';
import { Dropdown, Menu, Tooltip } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';
import { deleteItems } from '@/lib/api/proxima';
import { useLocation } from 'react-router-dom';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { usePageContext } from '../../hook';

import cx from './index.less';
import { getlinkedTestEntityByQuery } from '@/lib/api/item';
import { TestLinkType, TestType } from 'common/constant';

interface ExcetionListProps {
  planId: string;
  workspaceKey: string;
  activedType: string;
  executionId?: string;
  selectedExecution?: Record<string, any>;
  setSelectedExecution?: (val: Record<string, any>) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
  setLoading?: (val: boolean) => void;
}

const ExecutionList: React.FC<ExcetionListProps> = ({
  planId,
  activedType,
  workspaceKey,
  selectedExecution,
  setSelectedExecution,
  refreshExecution,
  setRefreshExecution,
  setLoading,
}) => {
  const { tableSelectionToggleEvent } = usePageContext();
  const { query } = useLocation();
  const [activedId, setActivedId] = useState('');

  // 事项数据更新后刷新列表
  useListener('updateItemList', () => {
    setTimeout(() => {
      refresh();
    }, 400);
  });

  useEffect(() => {
    if (selectedExecution?.objectId) {
      setActivedId(selectedExecution?.objectId);
    }
  }, [selectedExecution]);

  const { data, refresh, loading } = useRequest(
    async () => {
      if (activedType !== 'TestExecution') return [];
      // TODO 查询测试执行任务数据
      // const { list } = await getTestEntitiesByRelationWithOrder(
      //   TestRelationType.PlanRelExecution,
      //   {
      //     from: planId ? [planId] : [],
      //   },
      //   {
      //     workspaceKey,
      //     select: ['reference', 'workspaceKey'],
      //     include: ['reference'],
      //     descendingBy: ['createdAt'],
      //     ascendingBy: undefined,
      //     queryParams: { limit: 999, offset: 0 },
      //   },
      // );

      const { list } = await getlinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        linkType: TestLinkType.ExecutionLinkPlan,
        sourceIds: [planId],
        destinationType: TestType.Execution,
        descending: [],
        onlySelectId: false,
      });

      return list;
    },
    {
      refreshDeps: [planId, activedType],
    },
  );

  useEffect(() => {
    setLoading?.(loading);
  }, [loading]);

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
    if (data?.length && !activedId) {
      setSelectedExecution(data[0]);
    }
  }, [data, planId]);

  const menuClick = (type: string, data) => {
    if (type === 'check') {
      openItemViewScreen(data.objectId);
    }
    if (type === 'delete') {
      actionConfirm('该操作会将该测试执行任务删除，是否继续操作？', async () => {
        // await Promise.all([deleteTestEntities([data?.objectId]), deleteItems([data.objectId])]);
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

  const showList = (data ?? [])?.slice(0, 5);
  const hideList = (data ?? [])?.slice(5, data?.length ?? 0);

  const hideMenu = () => (
    <Menu>
      {hideList.map(d => (
        <Menu.Item key={d.objectId}>
          <div
            className={cx('hide-list-menu')}
            onClick={e => {
              e.preventDefault();
              setActivedId(d.objectId);
              tableSelectionToggleEvent.emit(false);
              setSelectedExecution(d);
            }}
          >
            <div className={cx('name')}>{d.name}</div>
            <div className={cx('icon')}>
              <Dropdown overlay={menu(d)} trigger={['hover']}>
                <EllipsisOutlined className={cx('action', 'right')} style={{ display: 'flex' }} />
              </Dropdown>
            </div>
          </div>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div className={cx('tab-list')}>
      {activedType === 'TestExecution' && (
        <>
          {!!data?.length && (
            <>
              <div className={cx('show-list')}>
                {showList.map((d, index) => (
                  <div
                    className={cx('execution-menu', `${activedId === d.objectId ? 'actived' : ''}`)}
                    key={index}
                    onClick={e => {
                      e.preventDefault();
                      setActivedId(d.objectId);
                      tableSelectionToggleEvent.emit(false);
                      setSelectedExecution(d);
                    }}
                  >
                    <div className={cx('name')} onClick={e => e.preventDefault()}>
                      <Tooltip placement="topLeft" title={d?.name ?? ''}>
                        {d?.name}
                      </Tooltip>
                    </div>
                    <div className={cx('icon')}>
                      <Dropdown overlay={menu(d)} trigger={['hover']}>
                        <EllipsisOutlined
                          className={cx('action', 'right')}
                          style={{ display: 'flex' }}
                        />
                      </Dropdown>
                    </div>
                  </div>
                ))}
                {!!hideList.length && (
                  <div className={cx('hide-list-icon')}>
                    <Dropdown overlay={hideMenu} trigger={['hover']}>
                      <div className={cx('more-box')}>
                        <EllipsisOutlined className={cx('icon')} />
                        <span className={cx('more')}>更多</span>
                      </div>
                    </Dropdown>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ExecutionList;
