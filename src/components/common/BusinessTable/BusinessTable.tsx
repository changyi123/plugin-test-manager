import React, { useMemo, useRef } from 'react';
import { pick, isEqual } from 'lodash';
import { getDevConfig } from '@/devEnv';
import { Resizable } from 'react-resizable';
import { TableProps } from 'antd/lib/table';
import ColumnSetting from './ColumnSetting';
import { Pagination, Table } from '@osui/ui';
import TableSelection from './TableSelection';
import { useSDK } from '@projectproxima/plugin-sdk';
import { useTestConfig } from '@/lib/hooks/useContext';
import { generateStorageKey } from '@/lib/utils/helper';
import { LibraryProvider } from '@projectproxima/components';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { getRootContainer, hasArrayItem } from '@/lib/utils/helper';
import { useAntdTable, useLocalStorageState, useSize } from 'ahooks';

import cx from './BusinessTable.less';

const DEFAULT_PAGE_SIZE = 10;
const MIN_COLUMN_WIDTH = 120;

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
  expandChangePage?: (num: number) => void;
  toggleSelection: (visible?: boolean) => void;
  selectedRows: any[];
  resetSelectedRows: () => void;
};

type BusinessTableProps = TableProps<any> & {
  name?: string;
  // 事项获取 key
  itemKey?: string;
  showPagination?: boolean;
  useColumnSetting?: boolean;
  onSelectionCancel?: () => void;
  isCheck?: boolean;
  setIsCheck?: (check: boolean) => void;
  expandChangePage?: (num: number, size?: number) => void;
  selectionActionNodes?: React.ReactNode[];
  actionRef?: React.ForwardedRef<ActionType>;
  PaginationFooterRender?: any;
  getDataSource?: (queryParams: { offset: number; limit: number }) => Promise<{
    list: any[];
    total: number;
  } | null>;
};

const BusinessTable: React.FC<BusinessTableProps> = props => {
  const {
    columns,
    actionRef,
    expandable,
    getDataSource,
    onSelectionCancel,
    selectionActionNodes,
    isCheck,
    setIsCheck,
    expandChangePage,
    itemKey = 'reference',
    showPagination = true,
    useColumnSetting = false,
    PaginationFooterRender,
    scroll = {
      x: 'max-content',
    },
    ...restTableProps
  } = props;

  const currentPageRowsRef = React.useRef([]);
  const initialExpandedRef = React.useRef(false);
  const [expandedRowKeys, setExpandedKeys] = React.useState([]);
  const [selectedRowDatas, setSelectedRowDatas] = React.useState<string[] | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<string[] | undefined>(undefined);
  const [selectionMode, setSelectionMode] = React.useState(false);
  const COLUMN_WIDTH_STORAGE_KEY = generateStorageKey(props.name, 'column-width');
  const PAGESIZE_STORAGE_KEY = generateStorageKey(props.name, 'default-pagesize');
  const [tableColumns, setTableColumns] = React.useState(useColumnSetting ? [] : columns);
  const [columnsWidth, setColumnsWidth] = useLocalStorageState(COLUMN_WIDTH_STORAGE_KEY, {
    defaultValue: {},
  });
  const [pagesize, setPageSize] = useLocalStorageState(PAGESIZE_STORAGE_KEY, {
    defaultValue: DEFAULT_PAGE_SIZE,
  });
  const { workspace } = useTestConfig();
  const { context } = useSDK();
  const proximaGatewayURL = context?.PROXIMA_GATEWAY ?? getDevConfig()?.baseURL;
  const ref = useRef(null);
  const size = useSize(ref);

  const scrollMemo = useMemo(() => {
    return {
      y: size?.height - 88, // 当前容器高度减去footer和header高度
      ...scroll,
    };
  }, [scroll, size]);

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
    if (selectionMode || !useColumnSetting) return null;
    return (
      <ColumnSetting
        itemKey={itemKey}
        name={props.name}
        additionalColumns={columns}
        className={`${cx('column-setting')} extra-column-setting`}
        onTableColumnChange={handleTableColumnChange}
      />
    );
  }, [columns, handleTableColumnChange, props.name, selectionMode, itemKey, useColumnSetting]);

  const { tableProps: antdTableProps, refresh } = useAntdTable(
    queryParams => {
      if (!queryParams) return null;
      const { current, pageSize } = queryParams;
      return getDataSource?.({
        offset: (current - 1) * pageSize,
        limit: pageSize,
      });
    },
    { defaultPageSize: pagesize, refreshDeps: [getDataSource] },
  );

  const dataSource = React.useMemo(
    () => (props.dataSource ?? antdTableProps.dataSource ?? []) as any[],
    [antdTableProps.dataSource, props.dataSource],
  );

  React.useEffect(() => {
    const { pagination } = antdTableProps;
    // 处理删除分页数据错误场景
    if (pagination.total && pagination.total <= pagination.pageSize * (pagination.current - 1)) {
      antdTableProps.onChange(
        Object.assign({}, pagination, {
          current: Math.max(0, pagination.current - 1),
        }),
      );
    }
  }, [antdTableProps]);

  React.useEffect(() => {
    // 数据源变更重置 selectedRowKeys
    if (Array.isArray(dataSource) && dataSource.length) {
      currentPageRowsRef.current = dataSource;
    }
  }, [dataSource]);

  React.useEffect(() => {
    if (!!isCheck !== selectedRowKeys?.length > 0) {
      setIsCheck?.(selectedRowKeys?.length > 0);
    }
  }, [selectedRowKeys, setIsCheck, isCheck]);

  const handleResize = (key, _e, { size }) => {
    setColumnsWidth(dict => ({
      ...dict,
      [key]: Math.max(MIN_COLUMN_WIDTH, size.width),
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
    const selectedRows = selectedRowKeys?.map(key =>
      dataSource.find(row => row[props.rowKey as any] === key),
    );

    const handleCheck = checked => {
      const allRowKeys = dataSource.map(item => item[props.rowKey as any]);
      const _selectedRowKeys = selectedRowKeys?.filter(d => !allRowKeys.includes(d)) ?? [];
      const _selectedRowDatas =
        selectedRowDatas?.filter(d => !allRowKeys.includes(d[props.rowKey as string])) ?? [];

      if (checked === false) {
        setSelectedRowKeys(_selectedRowKeys);
        setSelectedRowDatas(_selectedRowDatas);
      } else {
        setSelectedRowKeys(_selectedRowKeys.concat(allRowKeys));
        setSelectedRowDatas(_selectedRowDatas.concat(dataSource));
      }
    };

    const handleClose = () => {
      setSelectionMode(false);
      onSelectionCancel?.();
    };

    return (
      <div className={cx('selection-header')}>
        <TableSelection
          tableExpandable={Boolean(expandable)}
          onClose={handleClose}
          checkboxProps={{
            onChange: e => handleCheck(e.target.checked),
            checked:
              Boolean(selectedRows?.length) &&
              dataSource.filter(d => selectedRows.includes(d)).length === dataSource.length,
            indeterminate: Boolean(selectedRows?.length) && selectedRows.length < dataSource.length,
          }}
          selectNum={selectedRows?.length}
          actions={selectionActionNodes ?? []}
        />
      </div>
    );
  };

  const PaginationFooter = () => {
    if (!showPagination) return null;

    const pagination = antdTableProps.pagination;
    const handlePaginationChange = (current, pageSize) => {
      setPageSize(pageSize);
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
          pageSizeOptions={[10, 20, 50]}
          defaultPageSize={pagesize}
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
        onChange(rowKeys: string[]) {
          const curKeys = dataSource.map(d => d[props.rowKey as string]);
          const _selectedRowKeys = selectedRowKeys?.filter(d => !curKeys.includes(d)) ?? [];
          const _selectedRowDatas =
            selectedRowDatas?.filter(d => !curKeys.includes(d[props.rowKey as string])) ?? [];

          const _rowKeys = rowKeys.concat(_selectedRowKeys);

          const curRowDatas = dataSource.filter(d => rowKeys.includes(d[props.rowKey as string]));

          const _rowDatas = curRowDatas.concat(_selectedRowDatas);

          setSelectedRowKeys(_rowKeys);
          setSelectedRowDatas(_rowDatas);
        },
      }
    : undefined;

  React.useImperativeHandle(
    actionRef,
    () => ({
      toggleSelection(visible = true) {
        setSelectionMode(visible);
      },
      refresh,
      expandChangePage,
      selectedRows: selectedRowDatas,
      resetSelectedRows: () => {
        setSelectedRowKeys(undefined);
        setSelectedRowDatas(undefined);
      },
    }),
    [expandChangePage, selectedRowDatas, refresh],
  );

  React.useEffect(() => {
    if (!initialExpandedRef.current && hasArrayItem(dataSource)) {
      initialExpandedRef.current = true;
      setExpandedKeys([dataSource[0]?.[props.rowKey as string]]);
    }
  }, [dataSource, props.rowKey, setExpandedKeys]);

  return (
    <div className={cx('table-container')} ref={ref}>
      <LibraryProvider
        parse
        workspaceKey={workspace?.key}
        gatewayURL={proximaGatewayURL}
        getPopupContainer={getRootContainer}
      >
        <SelectionActionHeader />
        {ColumnSettingMemorizedNode}
        <Table
          sticky={true}
          scroll={scrollMemo}
          pagination={false}
          className={cx('table')}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
            body: {
              cell: OverflowTooltipBodyCell,
            },
          }}
          dataSource={dataSource}
          showHeader={!selectionMode}
          rowSelection={rowSelectionProp}
          loading={antdTableProps.loading}
          columns={columnsWithResizableAndSettingAction}
          expandable={
            expandable
              ? {
                  ...expandable,
                  fixed: true,
                  expandedRowKeys,
                  expandRowByClick: false,
                  onExpandedRowsChange: rows => setExpandedKeys(rows as any[]),
                }
              : undefined
          }
          {...restTableProps}
        />
        {PaginationFooterRender ? <PaginationFooterRender /> : <PaginationFooter />}
      </LibraryProvider>
    </div>
  );
};

export default React.memo(BusinessTable);
