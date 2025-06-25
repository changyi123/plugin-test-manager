import { useAntdTable, useSafeState } from 'ahooks';
import { Button, Checkbox, Popconfirm, Table, Tooltip } from 'antd';
import { TableProps } from 'antd/lib/table';
import { difference, uniqBy } from 'lodash';
import React from 'react';

import { DeleteIcon } from '@/icons';
import useI18n from '@/lib/hooks/useI18n';
import { getRootContainer, hasArrayItem } from '@/lib/utils/helper';

import cx from './index.less';

export type ActionType = { refresh: () => void; selectedRowKeys?: string[] };

type PanelTableProps = TableProps<any> & {
  actionRef?: React.RefObject<ActionType>;
  renderActions?: () => React.ReactNode;
  // 所有可选的 row 标识
  allSelectableRowKeys?: string[];
  getDataSource: (params: { offset: number; limit: number }) => Promise<any>;
  actionMenuList?: Array<{
    content: string | ((selectedRowKeys?) => React.ReactNode);
    key: string;
    onClick: (selectedRowKeys) => void;
  }>;
  onSuccess?: (data, mutate) => void;
};

const PanelTable: React.FC<PanelTableProps> = props => {
  const {
    columns,
    actionMenuList,
    getDataSource,
    actionRef,
    renderActions,
    allSelectableRowKeys,
    scroll,
    onSuccess,
    ...restTableProps
  } = props;
  // 全量的 row 数据
  const allRowDataRef = React.useRef([]);
  const { t } = useI18n();

  const [selectedRowKeys, setSelectedRowKeys] = useSafeState([]);
  const [batchSelect, setBatchSelect] = useSafeState(false);

  const { tableProps, refresh, mutate } = useAntdTable(
    ({ current, pageSize }) => {
      return getDataSource({
        offset: (current - 1) * pageSize,
        limit: pageSize,
      });
    },
    {
      defaultPageSize: 10,
      onSuccess: data => {
        onSuccess?.(data, mutate);
      },
    },
  );

  React.useEffect(() => {
    const { pagination } = tableProps;
    // 处理删除分页数据错误场景
    if (pagination.total && pagination.total <= pagination.pageSize * (pagination.current - 1)) {
      tableProps.onChange(
        Object.assign({}, pagination, {
          current: Math.max(0, pagination.current - 1),
        }),
      );
    }
  }, [tableProps]);

  React.useImperativeHandle(
    actionRef,
    () => ({
      refresh() {
        refresh();
        // 刷新后重置选中的 row
        setSelectedRowKeys([]);
      },
      selectedRowKeys,
    }),
    [refresh, setSelectedRowKeys, selectedRowKeys],
  );

  React.useEffect(() => {
    allRowDataRef.current = uniqBy(
      [].concat(allRowDataRef.current, tableProps.dataSource),
      props.rowKey ?? 'objectId',
    );
  }, [props.rowKey, tableProps.dataSource]);

  const tableColumnsProp = React.useMemo(() => {
    if (!batchSelect) return columns;

    return columns.map((item, index) => {
      if (index === 0) {
        const title = (
          <div className={cx('title-container')}>
            <div className={cx('current-page-text')}>
              {t('components.common.businessTable.checkCurrentPage')}
            </div>
            <div className={cx('dividing-line')} />
            <div>{item.title}</div>
          </div>
        );
        return {
          ...item,
          title,
        };
      }
      return item;
    });
  }, [batchSelect, columns, t]);

  const rowSelection = React.useMemo(
    () =>
      batchSelect && {
        fixed: true,
        // hideSelectAll: true,
        preserveSelectedRowKeys: true,
        selectedRowKeys,
        onChange: setSelectedRowKeys,
      },
    [batchSelect, selectedRowKeys, setSelectedRowKeys],
  );

  const handleBatchSelect = React.useCallback(() => {
    setBatchSelect(prev => !prev);
  }, [setBatchSelect]);

  const disableTableSelectAll = React.useMemo(() => {
    return !Array.isArray(allSelectableRowKeys);
  }, [allSelectableRowKeys]);

  // 是否全等 rowKey
  const isSameWithAllRowKeys = React.useMemo(() => {
    return !difference(allSelectableRowKeys, selectedRowKeys).length;
  }, [allSelectableRowKeys, selectedRowKeys]);
  // 有选中的值，但不全等全部 rowKey 则为半选
  const allRowSelectionIndeterminate = React.useMemo(() => {
    return !isSameWithAllRowKeys && !!selectedRowKeys?.length;
  }, [isSameWithAllRowKeys, selectedRowKeys?.length]);

  const handleCheck = React.useCallback(
    checked => {
      if (checked) {
        setSelectedRowKeys(allSelectableRowKeys);
      } else {
        // 取差集
        setSelectedRowKeys([]);
      }
    },
    [allSelectableRowKeys, setSelectedRowKeys],
  );

  return (
    <div className={cx('table')}>
      <div className={cx('actions-header')}>
        <div className={cx('left')}>
          {batchSelect ? (
            <>
              {disableTableSelectAll ? null : (
                <div className={cx('checkbox-wrapper')}>
                  <Tooltip
                    title={t('components.common.businessTable.checkAllPages')}
                    placement="leftTop"
                  >
                    <Checkbox
                      className={cx('checkbox')}
                      checked={isSameWithAllRowKeys}
                      disabled={tableProps.loading}
                      onChange={e => handleCheck(e.target.checked)}
                      indeterminate={allRowSelectionIndeterminate}
                    />
                  </Tooltip>
                  <span className={cx('checkbox-label')}>
                    {t('components.common.businessTable.checkAllPages')}
                  </span>
                </div>
              )}
              <div className={cx('select-tip')}>
                {t('components.business.panelTable.select')}
                <span className={cx('select-num')}>{selectedRowKeys.length}</span>
                {t('common.item', { count: selectedRowKeys.length })}
              </div>
            </>
          ) : null}
          {batchSelect && hasArrayItem(actionMenuList) && hasArrayItem(selectedRowKeys) ? (
            <div className={cx('actions')}>
              {actionMenuList.map((action, index) => (
                <>
                  {action?.key !== 'delete' ? (
                    <>
                      {typeof action?.content === 'function' ? (
                        <span className={cx('action-item')}>
                          {action?.content(selectedRowKeys)}
                        </span>
                      ) : (
                        <span
                          className={cx('action-item', 'action-item-delete')}
                          onClick={() => action?.onClick(selectedRowKeys)}
                        >
                          {action?.content}
                        </span>
                      )}
                    </>
                  ) : (
                    <Popconfirm
                      overlayClassName="global-popconfirm"
                      key={index}
                      placement="right"
                      getPopupContainer={getRootContainer}
                      title={`
                   ${t('components.business.panelTable.selectConfirmTips.0')}
                    ${action.content} 
                   ${t('components.business.panelTable.selectConfirmTips.1')}`}
                      onConfirm={() => action?.onClick(selectedRowKeys)}
                      okText={t('common.confirm')}
                      cancelText={t('common.cancel')}
                    >
                      <a className={cx('action-item', 'action-item-delete')}>
                        {' '}
                        <DeleteIcon className={cx('icon')} /> {action.content}
                      </a>
                    </Popconfirm>
                  )}
                </>
              ))}
            </div>
          ) : null}
        </div>
        <div className={cx('right')}>
          <Button type="default" onClick={handleBatchSelect}>
            {batchSelect ? t('common.cancelAction') : t('common.batchAction')}
          </Button>
          {typeof renderActions === 'function' ? <>{renderActions()}</> : null}
        </div>
      </div>
      <Table
        {...tableProps}
        {...restTableProps}
        scroll={scroll}
        pagination={{
          ...tableProps.pagination,
          size: 'small',
          showTotal(total) {
            return `${t('common.tableTotal.0')} ${total} ${t('common.tableTotal.1')}`;
          },
          pageSizeOptions: ['10', '30', '50'],
          showSizeChanger: true,
        }}
        rowSelection={rowSelection}
        columns={tableColumnsProp}
      />
    </div>
  );
};

PanelTable.defaultProps = {
  scroll: {
    x: 'max-content',
  },
};

export { columnBuilder } from './builtinColumns/base';
export * as BuiltinColumns from './builtinColumns';

export default React.memo(PanelTable);
