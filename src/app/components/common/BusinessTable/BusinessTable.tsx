import { LibraryProvider, useDataQuoteStore } from '@giteeteam/apps-team-components';
import { PluginSDKContext, useSDK } from '@projectproxima/plugin-sdk';
import { useAntdTable, useLocalStorageState, useSize } from 'ahooks';
import { Pagination, Table } from 'antd';
import { TableProps } from 'antd/lib/table';
import { difference, isEqual, omit, pick } from 'lodash';
import React, { useMemo, useRef } from 'react';
import { Resizable } from 'react-resizable';

import OverflowTooltip from '@/components/common/OverflowTooltip';
import { getDevConfig } from '@/devEnv';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import { generateStorageKey } from '@/lib/utils/helper';
import { getRootContainer, hasArrayItem } from '@/lib/utils/helper';
import { getLang } from '@/lib/utils/locale';

import cx from './BusinessTable.less';
import ColumnSetting from './ColumnSetting';
import TableSelection from './TableSelection';
import { TitleCellOption } from './type';

const DEFAULT_PAGE_SIZE = 10;
const MIN_COLUMN_WIDTH = 120;
const OFFSET_HEIGHT = 88;
const SELECTION_HEADER_HEIGHT = 40;

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
  const tdProps = pick(props, ['rowSpan', 'colSpan', 'style', 'className', 'onClick']);
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
  tableColumns: any[];
};

type BusinessTableProps = TableProps<any> &
  TitleCellOption & {
    name?: string;
    // 事项获取 key
    itemKey?: string;
    showPagination?: boolean;
    useColumnSetting?: boolean;
    defaultColumnKey?: string[];
    privateColumnKey?: string[];
    PaginationFooterRender?: any;
    bodyRowComponent?: any;
    // moveRow?: (val: Record<string, unknown>) => void;
    handleFilterField?: (val: { testType: string; fieldKeys: string[] }) => void;
    // 所有可选的 row 标识
    allSelectableRowKeys?: string[];
    onSelectionCancel?: () => void;
    // 是否已经有列被选中
    onHasRowSelected?: (check: boolean) => void;
    selectionActionNodes?: React.ReactNode[];
    actionRef?: React.ForwardedRef<ActionType>;
    expandChangePage?: (num: number, size?: number) => void;
    getDataSource?: (queryParams: { offset: number; limit: number }) => Promise<{
      list: any[];
      total: number;
    } | null>;
    testFieldKeys?: string[];
    setCheckedRowKeys?: (val?: string[]) => void;
  };

const BusinessTable: React.FC<BusinessTableProps> = props => {
  const {
    columns,
    testFieldKeys,
    defaultColumnKey,
    privateColumnKey,
    actionRef,
    expandable,
    getDataSource,
    bodyRowComponent,
    titleCellOption,
    onSelectionCancel,
    selectionActionNodes,
    onHasRowSelected,
    expandChangePage,
    setCheckedRowKeys,
    showPagination = true,
    useColumnSetting = false,
    PaginationFooterRender,
    scroll = {
      x: 'max-content',
    },
    className,
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
    const selectionHeaderHeight = selectionMode ? SELECTION_HEADER_HEIGHT : 0;
    return {
      y: size?.height - OFFSET_HEIGHT - selectionHeaderHeight, // 当前容器高度减去footer和header高度
      ...scroll,
    };
  }, [scroll, selectionMode, size?.height]);

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
        name={props?.name}
        testFieldKeys={testFieldKeys}
        handleFilterField={props?.handleFilterField}
        defaultColumnKey={defaultColumnKey}
        privateColumnKey={privateColumnKey}
        titleCellOption={titleCellOption}
        additionalColumns={columns}
        className={`${cx('column-setting')} extra-column-setting`}
        onTableColumnChange={handleTableColumnChange}
      />
    );
  }, [
    testFieldKeys,
    selectionMode,
    useColumnSetting,
    props?.name,
    props?.handleFilterField,
    titleCellOption,
    columns,
    defaultColumnKey,
    privateColumnKey,
    handleTableColumnChange,
  ]);

  const { tableProps: antdTableProps, refresh } = useAntdTable(
    queryParams => {
      if (!queryParams) return null;
      const { current, pageSize } = queryParams;
      const _current = current < 1 ? 1 : current;
      return getDataSource?.({
        offset: (_current - 1) * pageSize,
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
    onHasRowSelected?.(selectedRowKeys?.length > 0);
  }, [selectedRowKeys, onHasRowSelected]);

  const handleResize = (key, _e, { size }) => {
    setColumnsWidth(dict => ({
      ...dict,
      [key]: Math.max(MIN_COLUMN_WIDTH, size.width),
    }));
  };

  const columnsWithResizableAndSettingAction = tableColumns.map((col: any) => {
    const resizable = col.resizable ?? typeof col.width === 'number';
    const _col = omit(col, ['extraProps']);

    const cellOnClick = (record, row) =>
      row?.extraProps?.onClick
        ? {
            onClick: () => {
              row?.extraProps.onClick(record);
            },
          }
        : {};

    return {
      ..._col,
      resizable,
      width: resizable ? columnsWidth[col.key] ?? col.width : undefined,
      onCell: record =>
        ({
          ...cellOnClick(record, col),
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
    useDataQuoteStore(referenceList);
    if (!selectionMode) return null;
    const handleCheck = checked => {
      if (checked) {
        setSelectedRowKeys(allSelectableRowKeys);
        setCheckedRowKeys?.(allSelectableRowKeys);
      } else {
        // 取差集
        setSelectedRowKeys([]);
        setCheckedRowKeys?.([]);
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
      <div className={`${cx('selection-header')} selection-header-box`}>
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
    const { t } = useI18n();
    if (!showPagination) return null;
    const pagination = antdTableProps.pagination;
    const handlePaginationChange = (current, pageSize) => {
      setPageSize(pageSize);
      antdTableProps.onChange({ current, pageSize });
    };

    return (
      <div className={`${cx('footer')} footer-box`}>
        <div className={cx('num')}>
          {t('common.tableTotal.0')} <span>{pagination.total}</span> {t('common.tableTotal.1')}
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

  const rowSelectionProp =
    selectionMode && antdTableProps?.pagination?.total
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
            setCheckedRowKeys?.(_rowKeys);
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
        setCheckedRowKeys?.([]);
      },
      tableColumns,
    }),
    [refresh, selectedRowKeys, expandChangePage, tableColumns, setCheckedRowKeys],
  );

  React.useEffect(() => {
    if (!initialExpandedRef.current && hasArrayItem(dataSource)) {
      initialExpandedRef.current = true;
      setExpandedKeys([dataSource[0]?.[props.rowKey as string]]);
    }
  }, [dataSource, props.rowKey, setExpandedKeys]);

  return (
    <div className={`${cx('table-container')} table-box`} ref={ref}>
      <LibraryProvider
        lang={getLang()}
        workspaceKey={workspace?.key}
        gatewayURL={proximaGatewayURL}
        getPopupContainer={getRootContainer}
        sessionToken={pluginSDKContext?.context?.env.sessionToken ?? ''}
        applicationId={pluginSDKContext?.context?.env.PROXIMA_APP_ID ?? 'proxima-core'}
      >
        <SelectionActionHeader referenceList={dataSource} />
        {ColumnSettingMemorizedNode}
        <Table
          sticky={true}
          scroll={scrollMemo}
          pagination={false}
          className={cx('table', `${className ?? ''}`)}
          components={{
            header: {
              cell: ResizableHeaderCell,
            },
            body: {
              cell: OverflowTooltipBodyCell,
              row: bodyRowComponent,
            },
          }}
          onRow={(rowData, index) => {
            const attr = {
              index,
              rowData,
            };
            return attr as React.HTMLAttributes<any>;
          }}
          dataSource={dataSource}
          rowSelection={rowSelectionProp}
          loading={antdTableProps.loading || restTableProps.loading}
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
