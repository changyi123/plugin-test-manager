import React, { useMemo, useRef } from 'react';
import { getDevConfig } from '@/devEnv';
import { TitleCellOption } from './type';
import { Pagination, Table } from 'antd';
import { Resizable } from 'react-resizable';
import { TableProps } from 'antd/lib/table';
import ColumnSetting from './ColumnSetting';
import TableSelection from './TableSelection';
import { pick, isEqual, difference } from 'lodash';
import { useTestConfig } from '@/lib/hooks/useContext';
import { generateStorageKey } from '@/lib/utils/helper';
import OverflowTooltip from '@/components/common/OverflowTooltip';
import { getRootContainer, hasArrayItem } from '@/lib/utils/helper';
import { useSDK, PluginSDKContext } from '@projectproxima/plugin-sdk';
import { useAntdTable, useLocalStorageState, useSize } from 'ahooks';
import { LibraryProvider, useDataQuoteStore } from '@projectproxima/components';

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
  selectedRowKeys: any[];
  resetSelectedRowKeys: () => void;
};

type BusinessTableProps = TableProps<any> &
  TitleCellOption & {
    name?: string;
    // 事项获取 key
    itemKey?: string;
    isCheck?: boolean;
    showPagination?: boolean;
    useColumnSetting?: boolean;
    defaultColumnKey?: string[];
    PaginationFooterRender?: any;
    // 所有可选的 row 标识
    allSelectableRowKeys?: string[];
    onSelectionCancel?: () => void;
    setIsCheck?: (check: boolean) => void;
    selectionActionNodes?: React.ReactNode[];
    actionRef?: React.ForwardedRef<ActionType>;
    expandChangePage?: (num: number, size?: number) => void;
    getDataSource?: (queryParams: { offset: number; limit: number }) => Promise<{
      list: any[];
      total: number;
    } | null>;
  };

const BusinessTable: React.FC<BusinessTableProps> = props => {
  const {
    columns,
    defaultColumnKey,
    actionRef,
    expandable,
    getDataSource,
    titleCellOption,
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

  const pluginSDKContext: any = React.useContext(PluginSDKContext);

  const currentPageRowsRef = React.useRef([]);
  const initialExpandedRef = React.useRef(false);
  const [expandedRowKeys, setExpandedKeys] = React.useState([]);
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
        defaultColumnKey={defaultColumnKey}
        titleCellOption={titleCellOption}
        additionalColumns={columns}
        className={`${cx('column-setting')} extra-column-setting`}
        onTableColumnChange={handleTableColumnChange}
      />
    );
  }, [
    selectionMode,
    useColumnSetting,
    itemKey,
    props.name,
    titleCellOption,
    columns,
    defaultColumnKey,
    handleTableColumnChange,
  ]);

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

  // 当前页可选的 row keys
  const currentPageSelectableRowKeys = React.useMemo(() => {
    return dataSource.map(data => data[props.rowKey as string]) ?? [];
  }, [dataSource, props.rowKey]);

  // 所有可选的 row keys
  const allSelectableRowKeys = React.useMemo(() => {
    // 没有全部的则使用当前页的所有 rowKeys
    return props.allSelectableRowKeys ?? [];
  }, [props.allSelectableRowKeys]);

  const referenceList = useMemo(
    () => dataSource?.map(d => d?.reference).filter(Boolean),
    [dataSource],
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

  const SelectionActionHeader = ({ referenceList = [] }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useDataQuoteStore(referenceList);

    if (!selectionMode) return null;

    const handleCheck = checked => {
      if (checked) {
        setSelectedRowKeys(allSelectableRowKeys);
      } else {
        // 取差集
        setSelectedRowKeys([]);
      }
    };

    const handleClose = () => {
      setSelectionMode(false);
      onSelectionCancel?.();
    };

    const disableTableSelectAll = !Array.isArray(props.allSelectableRowKeys);
    // 是否全等 rowKey
    const isSameWithAllRowKeys = !difference(allSelectableRowKeys, selectedRowKeys).length;
    const allRowSelectionChecked = isSameWithAllRowKeys;
    // 有选中的值，但不全等全部 rowKey 则为半选
    const allRowSelectionIndeterminate = !isSameWithAllRowKeys && !!selectedRowKeys?.length;

    return (
      <div className={cx('selection-header')}>
        <TableSelection
          onClose={handleClose}
          tableExpandable={Boolean(expandable)}
          disableSelectAll={disableTableSelectAll}
          checkboxProps={{
            checked: allRowSelectionChecked,
            disabled: antdTableProps.loading,
            onChange: e => handleCheck(e.target.checked),
            indeterminate: allRowSelectionIndeterminate,
          }}
          selectNum={selectedRowKeys?.length}
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
          const _selectedRowKeys =
            selectedRowKeys?.filter(d => !currentPageSelectableRowKeys.includes(d)) ?? [];

          const _rowKeys = rowKeys.concat(_selectedRowKeys);

          setSelectedRowKeys(_rowKeys);
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
      selectedRowKeys,
      expandChangePage,
      resetSelectedRowKeys: () => {
        setSelectedRowKeys(undefined);
      },
    }),
    [expandChangePage, selectedRowKeys, refresh],
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
        workspaceKey={workspace?.key}
        gatewayURL={proximaGatewayURL}
        getPopupContainer={getRootContainer}
        sessionToken={pluginSDKContext?.context?.env.sessionToken ?? ''}
        applicationId={pluginSDKContext?.context?.env.PROXIMA_APP_ID ?? 'proxima-core'}
      >
        <SelectionActionHeader referenceList={referenceList} />
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
