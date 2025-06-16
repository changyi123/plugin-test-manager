import { EllipsisOutlined } from '@ant-design/icons';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { Dropdown, Menu, message, notification, Spin } from 'antd';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';

import SearchInput from '@/components/business/SearchInput';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { deleteTestEntity, updateTestEntity } from '@/lib/api/item';
import useI18n from '@/lib/hooks/useI18n';
import { actionConfirm, openItemViewScreen } from '@/lib/utils/helper';

import { usePageContext } from '../../hook';
import cx from './index.less';

type ExecutionListRef = {
  refresh?: () => void;
};

interface ExecutionListProps {
  actionRef?: React.MutableRefObject<ExecutionListRef>;
  activeType: string;
  executionId?: string;
  setSelectedExecution?: (val: Record<string, any>) => void;
  refreshExecution?: boolean;
  setRefreshExecution?: (val: boolean) => void;
  setLoading?: (val: boolean) => void;

  refresh: () => void;
  loading: boolean;
  executionList: any[];
  activeId: string;
  setActiveId: any;

  setSelectors: any;
}

const ExecutionList: React.FC<ExecutionListProps> = ({
  actionRef,
  activeType,
  setSelectedExecution,
  setLoading,

  refresh,
  loading,
  executionList,
  activeId,
  setActiveId,
  setSelectors,
}) => {
  const { t } = useI18n();
  const { tableSelectionToggleEvent } = usePageContext();
  const [searchValue, setSearchValue] = useState<string>();

  // 事项数据更新后刷新列表
  useListener('updateItemList', async props => {
    if (props?.type === 'create') return;
    if (props?.type === 'delete') {
      // setActiveId('');
    }
    setTimeout(() => {
      actionRef.current?.refresh();
    }, 500);
  });

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
    if (type === 'remove') {
      actionConfirm(
        {
          title: t('common.tip'),
          okText: t('common.okText'),
          cancelText: t('common.cancel'),
          content: t('page.plan.planPageLayout.executionList.removeTips'),
        },
        async () => {
          setLoading?.(true);
          const res = await updateTestEntity([
            {
              objectId: data?.objectId,
              linkItems: {
                action: 'delete',
                value: data?.linkItems || [],
              },
            },
          ]);
          if (res?.status === 'error') {
            setLoading?.(false);
            message.error(res.data);
            return;
          }
          setTimeout(() => {
            refresh && refresh();
          }, 500);
          setLoading?.(false);
          notification.success({
            message: t('page.plan.planPageLayout.executionList.removeSuccess'),
          });
        },
      );
    }
  };

  // 当删除or 移除 任务时， 选中项默认第一条数据
  useEffect(() => {
    const _objectIdArray = _.map(executionList, item => item?.objectId);
    if (!_.isEmpty(_objectIdArray)) {
      setActiveId(_objectIdArray[0]);
      tableSelectionToggleEvent.emit(false);
      setSelectedExecution(executionList[0]);
    } else {
      setActiveId(null);
      tableSelectionToggleEvent.emit(false);
      setSelectedExecution(null);
    }
  }, [executionList.length]);

  const menu = data => (
    <Menu onClick={e => menuClick(e.key, data)}>
      <Menu.Item key="check">{t('page.plan.planPageLayout.executionList.checkTask')}</Menu.Item>
      <Menu.Item key="delete">{t('page.plan.planPageLayout.executionList.deleteTask')}</Menu.Item>
      <Menu.Item key="remove">{t('page.plan.planPageLayout.executionList.removeTask')}</Menu.Item>
    </Menu>
  );

  return (
    <>
      <SearchInput
        showInput
        allowClear
        className={cx('fold-search')}
        searchIconClick={true}
        onSearch={() => {
          setSelectors([
            {
              name: {
                component: 'name',
                expression: '',
                fieldId: 'name',
                fieldLabel: [],
                fieldName: '标题',
                key: 'name',
                value: searchValue,
              },
            },
          ]);
        }}
        onChange={v => setSearchValue(v)}
        value={searchValue}
        placeholder={t('components.common.filterSearch.screenPlaceholder')}
      />
      <div className={cx('tree-box')}>
        <Spin size="small" spinning={loading}>
          <div className={cx('tab-list')}>
            {activeType === 'TestExecution' && (
              <>
                {!!executionList?.length && (
                  <>
                    <div className={cx('show-list')}>
                      {executionList.map((d, index) => (
                        <div
                          className={cx(
                            'execution-menu',
                            `${activeId === d.objectId ? 'actived' : ''}`,
                          )}
                          key={index}
                          onClick={e => {
                            e.preventDefault();
                            setActiveId(d.objectId);
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
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </Spin>
      </div>
    </>
  );
};

export default ExecutionList;
