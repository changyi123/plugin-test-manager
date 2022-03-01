import React from 'react';
import { pick } from 'lodash';
import { Resizable } from 'react-resizable';
import { TableProps } from 'antd/lib/table';
import { Pagination, Table } from '@osui/ui';
import { useAntdTable, useLocalStorageState } from 'ahooks';
import OverflowTooltip from '@/components/common/OverflowTooltip';

import cx from './BusinessTable.less';

const DefaultPageSize = 20;
const TableColumnStorageKey = 'TEST_MANAGER_TABLE_COLUMN_WITH';

const ResizableHeaderCell = ({ onResize, width, ...restProps }) => {
  const thProps = pick(restProps, ['children', 'rowSpan', 'colSpan', 'style', 'className']);
  if (!width) {
    return <th {...thProps} />;
  }

  return (
    <Resizable
      handle={
        <span
          className={cx('resizable-handle', 'resizable-handle-global')}
          onClick={e => {
            e.stopPropagation();
          }}
        />
      }
      height={0}
      width={width}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...thProps} />
    </Resizable>
  );
};

const OverflowTooltipBodyCell = props => {
  const tdProps = pick(props, ['rowSpan', 'colSpan', 'style', 'className']);
  if (!props.overflowEllipsis) return <td {...tdProps}>{props.children}</td>;

  return (
    <td {...tdProps}>
      <OverflowTooltip title={props.children}>{props.children}</OverflowTooltip>
    </td>
  );
};

export type ActionType = {
  refresh: () => void;
  toggleSelection: (visible?: boolean) => void;
};

type BusinessTableProps = TableProps<any> & {
  getDataSource?: (queryParams: { offset: number; limit: number }) => Promise<{
    list: any[];
    total: number;
  } | null>;
  actionRef?: React.ForwardedRef<ActionType>;
  renderSelectionActionHeader?: (args: {
    selectedRows: any[];
    toggleAllRowsChecked: (checked?: boolean) => void;
    toggleSelection: (visible?: boolean) => void;
  }) => React.ReactNode;
};

const BusinessTable: React.FC<BusinessTableProps> = props => {
  const { actionRef, renderSelectionActionHeader, columns, getDataSource, ...restTableProps } =
    props;
  const currentPageRowsRef = React.useRef([]);
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [columnsWidth, setColumnsWidth] = useLocalStorageState(TableColumnStorageKey, {
    defaultValue: {},
  });

  const { tableProps: antdTableProps, refresh } = useAntdTable(
    queryParams => {
      if (!queryParams) return null;
      const { current, pageSize } = queryParams;
      return getDataSource({
        offset: (current - 1) * pageSize,
        limit: pageSize,
      });
    },
    { defaultPageSize: DefaultPageSize },
  );

  React.useEffect(() => {
    // 数据源变更重置 selectedRowKeys
    if (Array.isArray(antdTableProps.dataSource) && antdTableProps.dataSource.length) {
      setSelectedRowKeys([]);
      currentPageRowsRef.current = antdTableProps.dataSource;
    }
  }, [setSelectedRowKeys, antdTableProps.dataSource]);

  const handleResize = (key, _e, { size }) => {
    setColumnsWidth(dict => ({
      ...dict,
      [key]: size.width,
    }));
  };

  const columnsWithResizable = columns.map((col: any) => {
    const canResize = typeof col.width === 'number';
    return {
      ...col,
      width: canResize ? columnsWidth[col.key] ?? col.width : undefined,
      onCell: () =>
        ({
          overflowEllipsis:
            typeof col.overflowEllipsis === 'boolean' ? col.overflowEllipsis : Boolean(canResize),
        } as any),
      onHeaderCell: column => ({
        ...column,
        width: column.width,
        onResize: handleResize.bind(null, col.key),
      }),
    };
  });

  const SelectionActionHeader = () => {
    if (!selectionMode) return null;
    const node = renderSelectionActionHeader?.({
      selectedRows: selectedRowKeys.map(key =>
        currentPageRowsRef.current.find(row => row[props.rowKey as any] === key),
      ),
      toggleAllRowsChecked: (checked = true) => {
        if (checked === false) {
          setSelectedRowKeys([]);
        } else {
          const allRowKeys = antdTableProps.dataSource.map(item => item[props.rowKey as any]);
          setSelectedRowKeys(allRowKeys);
        }
      },
      toggleSelection(visible = false) {
        setSelectionMode(visible);
      },
    });
    if (node) return <div className={cx('selection-header')}>{node}</div>;
  };

  const PaginationFooter = () => {
    const pagination = antdTableProps.pagination;

    const handlePaginationChange = (current, pageSize) => {
      antdTableProps.onChange({ current, pageSize });
    };

    return (
      <div className={cx('footer')}>
        <div className={cx('num')}>
          共 <span>{pagination.total}</span> 个
        </div>
        <Pagination
          size="small"
          showSizeChanger={true}
          className={cx('pagination')}
          defaultPageSize={DefaultPageSize}
          onChange={handlePaginationChange}
          {...pagination}
        />
      </div>
    );
  };

  const rowSelectionProp = selectionMode
    ? {
        fixed: true,
        minWidth: 32,
        maxWidth: 32,
        columnWidth: 32,
        selectedRowKeys,
        onChange(selectedRowKeys) {
          setSelectedRowKeys(selectedRowKeys);
        },
      }
    : undefined;

  React.useImperativeHandle(actionRef, () => ({
    toggleSelection(visible = true) {
      setSelectionMode(visible);
    },
    refresh,
  }));

  return (
    <div className={cx('table-container')}>
      <SelectionActionHeader />
      <Table
        sticky={true}
        pagination={false}
        className={cx('table')}
        scroll={{
          x: 'max-content',
        }}
        components={{
          header: {
            cell: ResizableHeaderCell,
          },
          body: {
            cell: OverflowTooltipBodyCell,
          },
        }}
        showHeader={!selectionMode}
        columns={columnsWithResizable}
        rowSelection={rowSelectionProp}
        loading={antdTableProps.loading}
        dataSource={antdTableProps.dataSource}
        {...restTableProps}
      />
      <PaginationFooter />
    </div>
  );
};

export default React.memo(BusinessTable);
