import { EllipsisOutlined } from '@ant-design/icons';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { useRequest } from 'ahooks';
import { Dropdown, Menu, message, notification } from 'antd';
import { TestLinkType, TestType } from 'common/constant';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import OverflowTooltip from '@/components/common/OverflowTooltip';
import { deleteTestEntity, getLinkedTestEntityByQuery } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';

import { usePageContext } from '../../hook';
import cx from './index.less';

type ExecutionListRef = {
  refresh?: () => void;
};

interface ExecutionListProps {
  actionRef?: React.MutableRefObject<ExecutionListRef>;
  planId: string;
  workspaceKey: string;
  activeType: string;
  executionId?: string;
  selectedExecution?: Record<string, any>;
  setSelectedExecution?: (val: Record<string, any>) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
  setLoading?: (val: boolean) => void;
  setExecutionKeys?: (val?: string[]) => void;
}

const ExecutionList: React.FC<ExecutionListProps> = ({
  actionRef,
  planId,
  activeType,
  workspaceKey,
  selectedExecution,
  setSelectedExecution,
  setLoading,
  setExecutionKeys,
}) => {
  const { t } = useI18n();
  const { tableSelectionToggleEvent, setActiveExecutionPlan } = usePageContext();
  const { query } = useLocation();
  const [activeId, setActiveId] = useState('');

  const deleteRef = useRef('');

  // 事项数据更新后刷新列表
  useListener('updateItemList', async props => {
    if (props?.type === 'create') return;
    if (props?.type === 'delete') {
      setActiveId('');
    }
    setTimeout(() => {
      actionRef.current?.refresh();
    }, 500);
  });

  // useListener('deleteExecutionRefresh', () => {
  //   setActiveId('');
  //   setTimeout(() => {
  //     actionRef.current?.refresh();
  //   }, 500);
  // });

  const {
    refresh,
    loading,
    data: executionList,
  } = useRequest(
    async () => {
      if (activeType !== 'TestExecution') return [];

      const { list } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.ExecutionLinkPlan,
        sourceIds: [planId],
        destinationType: TestType.Execution,
      });
      setExecutionKeys(list?.map(d => d.id));

      return list;
    },
    {
      refreshDeps: [planId, activeType],
    },
  );

  React.useImperativeHandle(
    actionRef,
    () => ({
      refresh,
    }),
    [refresh],
  );

  useEffect(() => {
    setLoading(loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    if (!deleteRef.current) return;

    if (!executionList?.includes(deleteRef.current)) {
      deleteRef.current = '';
    }
  }, [executionList]);

  // 选中测试执行任务
  useEffect(() => {
    let activeId = selectedExecution?.objectId;
    if (!activeId && executionList?.length) {
      activeId = executionList?.[0]?.objectId;
    } else if (!activeId && query?.executionId) {
      activeId = query?.executionId;
    }

    if (activeId === deleteRef.current) {
      return;
    }

    if (activeId && executionList?.length) {
      const selectedExecution = executionList?.find(d => d.objectId === activeId);
      if (selectedExecution?.linkItems?.includes(planId)) {
        setActiveId(activeId);
        setActiveExecutionPlan(selectedExecution);
        setSelectedExecution(selectedExecution);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExecution, executionList, planId]);

  const menuClick = (type: string, data) => {
    if (type === 'check') {
      openItemViewScreen(data.objectId);
    }
    if (type === 'delete') {
      actionConfirm(
        {
          title: t('common.tip'),
          okText: t('common.okText'),
          cancelText: t('common.cancel'),
          content: t('page.plan.planPageLayout.executionList.deleteTips'),
        },
        async () => {
          setLoading?.(true);
          const res = await deleteTestEntity([data?.objectId]);
          if (res?.status === 'error') {
            setLoading?.(false);
            message.error(res.data);
            return;
          }
          deleteRef.current = data?.objectId;
          const firstExecution = executionList.filter(
            item => item.objectId !== data?.objectId,
          )?.[0];
          setActiveId(firstExecution?.objectId);
          setSelectedExecution(firstExecution);

          setTimeout(() => {
            actionRef.current?.refresh();
          }, 500);
          setLoading?.(false);
          notification.success({
            message: t('page.plan.planPageLayout.executionList.deleteSuccess'),
          });
        },
      );
    }
  };

  const menu = data => (
    <Menu onClick={e => menuClick(e.key, data)}>
      <Menu.Item key="check">{t('page.plan.planPageLayout.executionList.checkTask')}</Menu.Item>
      <Menu.Item key="delete">{t('page.plan.planPageLayout.executionList.deleteTask')}</Menu.Item>
    </Menu>
  );

  const showList = (executionList ?? [])?.slice(0, 5);
  const hideList = (executionList ?? [])?.slice(5, executionList?.length ?? 0);

  const hideMenu = () => (
    <Menu className={cx('hide-menu-box')}>
      {hideList.map(d => (
        <Menu.Item key={d.objectId}>
          <div
            className={cx('hide-list-menu')}
            onClick={e => {
              e.preventDefault();
              setActiveId(d.objectId);
              setActiveExecutionPlan(d);
              tableSelectionToggleEvent.emit(false);
              setSelectedExecution(d);
            }}
          >
            <div className={cx('name')}>
              <OverflowTooltip placement="topLeft" title={d?.name ?? ''}>
                {d?.name}
              </OverflowTooltip>
            </div>
            <div className={cx('icon')}>
              <Dropdown dropdownRender={() => menu(d)} trigger={['hover']}>
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
      {activeType === 'TestExecution' && (
        <>
          {!!executionList?.length && (
            <>
              <div className={cx('show-list')}>
                {showList.map((d, index) => (
                  <div
                    className={cx('execution-menu', `${activeId === d.objectId ? 'actived' : ''}`)}
                    key={index}
                    onClick={e => {
                      e.preventDefault();
                      setActiveId(d.objectId);
                      setActiveExecutionPlan(d);
                      tableSelectionToggleEvent.emit(false);
                      setSelectedExecution(d);
                    }}
                  >
                    <div className={cx('name')} onClick={e => e.preventDefault()}>
                      <OverflowTooltip placement="topLeft" title={d?.name ?? ''}>
                        {d?.name}
                      </OverflowTooltip>
                    </div>
                    <div className={cx('icon')}>
                      <Dropdown dropdownRender={() => menu(d)} trigger={['hover']}>
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
                    <Dropdown dropdownRender={hideMenu} trigger={['hover']}>
                      <div className={cx('more-box')}>
                        <EllipsisOutlined className={cx('icon')} />
                        <span className={cx('more')}>{t('common.more')}</span>
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
