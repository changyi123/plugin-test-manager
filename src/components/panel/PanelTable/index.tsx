import React from 'react';
import { get, uniqBy } from 'lodash';
import { Table, Button } from '@osui/ui';
import { TableProps } from 'antd/lib/table';
import { DownOutlined } from '@ant-design/icons';
import { hasArrayItem } from '@/lib/utils/helper';
import { useAntdTable, useGetState } from 'ahooks';
import DropDownButton from '@/components/panel/DropDownButton';

import cx from './index.less';

export type ActionType = { refresh: () => void };

type PanelTableProps = TableProps<any> & {
  actionRef?: React.RefObject<ActionType>;
  renderActions?: () => React.ReactNode;
  getDataSource: (params: { offset: number; limit: number }) => Promise<any>;
  actionMenuList?: Array<{ title: string; onClick: (selectedRowKeys) => void }>;
};

const PanelTable: React.FC<PanelTableProps> = props => {
  const { columns, actionMenuList, getDataSource, actionRef, renderActions, ...restTableProps } =
    props;
  // 全量的 row 数据
  const allRowDataRef = React.useRef([]);

  const [selectedRowKeys, setSelectedRowKeys] = useGetState([]);

  const { tableProps, refresh } = useAntdTable(
    ({ current, pageSize }) => {
      return getDataSource({
        offset: (current - 1) * pageSize,
        limit: pageSize,
      });
    },
    { defaultPageSize: 10 },
  );

  React.useImperativeHandle(
    actionRef,
    () => ({
      refresh() {
        refresh();
        // 刷新后重置选中的 row
        setSelectedRowKeys([]);
      },
    }),
    [refresh, setSelectedRowKeys],
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
    () => ({
      fixed: true,
      hideSelectAll: true,
      preserveSelectedRowKeys: true,
      selectedRowKeys: selectedRowKeys,
      onChange: selectedRowKeys => {
        setSelectedRowKeys(selectedRowKeys);
      },
    }),
    [selectedRowKeys, setSelectedRowKeys],
  );

  return (
    <div className={cx('table')}>
      <div className={cx('actions')}>
        <div className={cx('left')}>
          <DropDownButton
            menuList={[
              {
                onClick() {
                  const keys = tableProps.dataSource.map(data => get(data, props.rowKey as string));
                  setSelectedRowKeys(keys);
                },
                title: '本页全部',
              },
              {
                onClick() {
                  setSelectedRowKeys([]);
                },
                title: '取消选择',
              },
            ]}
            buttonProps={{ type: 'default' }}
          >
            批量选择 <DownOutlined />
          </DropDownButton>
          {/* <Button type="default">批量选择</Button> */}
          {hasArrayItem(selectedRowKeys) && hasArrayItem(actionMenuList) ? (
            <DropDownButton
              className={cx('button-select')}
              buttonProps={{ type: 'default' }}
              menuList={(actionMenuList ?? []).map(action => ({
                ...action,
                onClick() {
                  action.onClick(
                    allRowDataRef.current.filter(row =>
                      selectedRowKeys.includes(get(row, props.rowKey as string)),
                    ),
                  );
                },
              }))}
            >
              ({selectedRowKeys.length})个已选择
              <DownOutlined />
            </DropDownButton>
          ) : null}
        </div>
        {typeof renderActions === 'function' ? (
          <div className={cx('right')}>{renderActions()}</div>
        ) : null}
      </div>
      <Table
        {...tableProps}
        {...restTableProps}
        scroll={{
          x: 'max-content',
        }}
        pagination={{
          ...tableProps.pagination,
          size: 'small',
          showTotal(total) {
            return `共 ${total} 条数据`;
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

export { columnBuilder } from './builtinColumns/base';
export * as BuiltinColumns from './builtinColumns';

export default React.memo(PanelTable);
