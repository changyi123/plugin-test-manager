import React from 'react';
import { uniqBy } from 'lodash';
import { TableProps } from 'antd/lib/table';
import { useAntdTable, useSafeState } from 'ahooks';
import { Table, Button, Popconfirm } from 'antd';
import { hasArrayItem, getRootContainer } from '@/lib/utils/helper';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

export type ActionType = { refresh: () => void; selectedRowKeys?: string[] };

type PanelTableProps = TableProps<any> & {
  actionRef?: React.RefObject<ActionType>;
  renderActions?: () => React.ReactNode;
  getDataSource: (params: { offset: number; limit: number }) => Promise<any>;
  actionMenuList?: Array<{ title: string; onClick: (selectedRowKeys) => void }>;
};

const PanelTable: React.FC<PanelTableProps> = props => {
  const {
    columns,
    actionMenuList,
    getDataSource,
    actionRef,
    renderActions,
    scroll,
    ...restTableProps
  } = props;
  // 全量的 row 数据
  const allRowDataRef = React.useRef([]);
  const { t } = useI18n();

  const [selectedRowKeys, setSelectedRowKeys] = useSafeState([]);
  const [batchSelect, setBatchSelect] = useSafeState(false);

  const { tableProps, refresh } = useAntdTable(
    ({ current, pageSize }) => {
      return getDataSource({
        offset: (current - 1) * pageSize,
        limit: pageSize,
      });
    },
    { defaultPageSize: 10 },
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
    return columns;
  }, [columns]);

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

  return (
    <div className={cx('table')}>
      <div className={cx('actions-header')}>
        <div className={cx('left')}>
          <Button type="default" onClick={handleBatchSelect}>
            {batchSelect ? t('common.cancelSelect') : t('common.batchSelect')}
          </Button>
          {batchSelect ? (
            <div className={cx('select-tip')}>
              {`${t('components.business.panelTable.select')}
               ${selectedRowKeys.length} 
              ${t('common.item', { count: selectedRowKeys.length })}`}
            </div>
          ) : null}
          {batchSelect && hasArrayItem(actionMenuList) && hasArrayItem(selectedRowKeys) ? (
            <div className={cx('actions')}>
              {actionMenuList.map((action, index) => (
                <Popconfirm
                  key={index}
                  placement="right"
                  getPopupContainer={() => getRootContainer()}
                  title={`
                   ${t('components.business.panelTable.selectConfirmTips.0')}
                    ${action.title} 
                   ${t('components.business.panelTable.selectConfirmTips.1')}`}
                  onConfirm={() => action?.onClick(selectedRowKeys)}
                  okText={t('common.confirm')}
                  cancelText={t('common.cancel')}
                >
                  <a>{action.title}</a>
                </Popconfirm>
              ))}
            </div>
          ) : null}
        </div>
        {typeof renderActions === 'function' ? (
          <div className={cx('right')}>{renderActions()}</div>
        ) : null}
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
