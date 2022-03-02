import React from 'react';
import { pick, isEqual } from 'lodash';
import { Resizable } from 'react-resizable';
import { TableProps } from 'antd/lib/table';
import ColumnSetting from './ColumnSetting';
import { Pagination, Table } from '@osui/ui';
import { generateStorageKey } from '@/lib/utils/helper';
import { useAntdTable, useLocalStorageState } from 'ahooks';
import OverflowTooltip from '@/components/common/OverflowTooltip';

import cx from './BusinessTable.less';

const DefaultPageSize = 20;

const ResizableHeaderCell = ({ onResize, resizable, width, ...restProps }) => {
  const thProps = pick(restProps, ['children', 'rowSpan', 'colSpan', 'style', 'className']);
  if (!resizable) {
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
  name?: string;
};

const BusinessTable: React.FC<BusinessTableProps> = props => {
  const { actionRef, renderSelectionActionHeader, columns, getDataSource, ...restTableProps } =
    props;
  const currentPageRowsRef = React.useRef([]);
  const [tableColumns, setTableColumns] = React.useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const LOCAL_STORAGE_KEY = generateStorageKey(props.name, 'column-width');
  const [columnsWidth, setColumnsWidth] = useLocalStorageState(LOCAL_STORAGE_KEY, {
    defaultValue: {},
  });

  const handleTableColumnChange = React.useCallback(columns => {
    setTableColumns(prevState => {
      const prevStateKey = prevState.map(item => item.key);
      const columnKey = columns.map(item => item.key);
      if (!isEqual(prevStateKey, columnKey)) {
        return columns;
      }
      return prevState;
    });
  }, []);

  const ColumnSettingMemorizedNode = React.useMemo(() => {
    return (
      <ColumnSetting
        name={props.name}
        additionalColumns={columns}
        className={cx('column-setting')}
        onTableColumnChange={handleTableColumnChange}
      />
    );
  }, [columns, handleTableColumnChange, props.name]);

  const TableHeaderRow = ({ children, className, ...restProps }) => {
    return (
      <tr {...restProps} className={cx(className, 'table-header')}>
        {children}
        <td>{ColumnSettingMemorizedNode}</td>
      </tr>
    );
  };

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

  const columnsWithResizableAndSettingAction = tableColumns.map((col: any) => {
    const resizable = col.resizable ?? typeof col.width === 'number';

    return {
      ...col,
      resizable,
      width: resizable ? columnsWidth[col.key] ?? col.width : undefined,
      onCell: () =>
        ({
          resizable,
          overflowEllipsis:
            typeof col.overflowEllipsis === 'boolean' ? col.overflowEllipsis : Boolean(resizable),
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
            row: TableHeaderRow,
            cell: ResizableHeaderCell,
          },
          body: {
            cell: OverflowTooltipBodyCell,
          },
        }}
        showHeader={!selectionMode}
        rowSelection={rowSelectionProp}
        loading={antdTableProps.loading}
        dataSource={antdTableProps.dataSource}
        columns={columnsWithResizableAndSettingAction}
        {...restTableProps}
      />

      <PaginationFooter />
    </div>
  );
};

export default React.memo(BusinessTable);
