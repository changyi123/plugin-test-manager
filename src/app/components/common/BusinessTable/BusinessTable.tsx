import { useLocalStorageState, useMemoizedFn, useSize } from 'ahooks';
import { Pagination, Table, Tooltip } from 'antd';
import { ColumnsType, TableProps } from 'antd/lib/table';
import { useDataQuoteStore } from 'apps-team-components-v1';
import { TestFiledKeyMapping } from 'common/constant';
import { difference, isEqual, omit, pick } from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';
import { useCallback } from 'react';
import { Resizable } from 'react-resizable';

import OverflowTooltip from '@/components/common/OverflowTooltip';
import { CaretRightOutlined } from '@/icons';
import { getItemByIQL } from '@/lib/api/proxima';
import useI18n from '@/lib/hooks/useI18n';
import useTable from '@/lib/hooks/useTable';
import { generateStorageKey } from '@/lib/utils/helper';

// import { hasArrayItem } from '@/lib/utils/helper';
import cx from './BusinessTable.less';
import ColumnSetting from './ColumnSetting';
import TableSelection from './TableSelection';
import type { BusinessTableActionType } from './type';
import type { EnableCacheEpandedRowKeys, TitleCellOption } from './type';

const DEFAULT_PAGE_SIZE = 10;
const MIN_COLUMN_WIDTH = 120;
const OFFSET_HEIGHT = 92;
const SELECTION_HEADER_HEIGHT = 42;

const ResizableHeaderCell = ({ onResize, resizable, width, onClick, onSort, ...restProps }) => {
  const resizingDataRef = useRef(false);
  const thProps = pick(restProps, ['children', 'rowSpan', 'colSpan', 'style', 'className']);
  thProps.children = thProps.children.filter(Boolean)[0];
  if (!thProps.children) return;
  if (!resizable) {
    return <th {...thProps} />;
  }

  return (
    <Resizable
      onResizeStart={() => {
        resizingDataRef.current = true;
      }}
      onResizeStop={() => {
        resizingDataRef.current = false;
      }}
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
      <th
        onClick={e => {
          if (resizingDataRef.current) return;
          onClick?.(e);
          onSort?.(e, restProps);
        }}
        {...thProps}
      />
    </Resizable>
  );
};

const OverflowTooltipBodyCell = props => {
  const tdProps = pick(props, ['rowSpan', 'colSpan', 'style', 'title', 'className', 'onClick']);
  if (!props.overflowEllipsis) return <td {...tdProps}>{props.children.filter(Boolean)?.[0]}</td>;

  return (
    <td {...tdProps}>
      <OverflowTooltip
        overlayClassName="global_arrow_tooltip_overflow"
        title={props.children.filter(Boolean)?.[0]}
      >
        {props.children.filter(Boolean)?.[0]}
      </OverflowTooltip>
    </td>
  );
};

type BusinessTableProps = TableProps<any> &
  Partial<TitleCellOption> & {
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
    virtualSelectAll?: boolean;
    // 是否已经有列被选中
    onHasRowSelected?: (check: boolean) => void;
    selectionActionNodes?: React.ReactNode[];
    actionRef?: React.ForwardedRef<BusinessTableActionType>;
    expandChangePage?: (num: number, size?: number) => void;
    getDataSource?: (
      queryParams: { offset: number; limit: number },
      columnFields?: ColumnsType<any>,
    ) => Promise<{
      list: any[];
      total: number;
    } | null>;
    testFieldKeys?: string[];
    setCheckedRowKeys?: (val?: string[]) => void;
    selectionMode?: boolean;
    queryDeps?: string;
    onSuccess?: (data: any, mutate: (data: any) => void) => void;
    cacheKey?: string;
    ignoreInit?: boolean;
    getContainer?: any;
    enableCacheEpandedRowKeys?: EnableCacheEpandedRowKeys;
  };

const BusinessTable: React.FC<BusinessTableProps> = props => {
  const {
    columns,
    testFieldKeys,
    defaultColumnKey,
    virtualSelectAll,
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
    selectionMode: selectionModeFromProp,
    scroll = {
      x: 'max-content',
    },
    className,
    queryDeps,
    onSuccess,
    cacheKey,
    ignoreInit,
    getContainer,
    enableCacheEpandedRowKeys = 'disable',
    ...restTableProps
  } = props;

  const currentPageRowsRef = React.useRef([]);
  const initialExpandedRef = React.useRef(false);
  const [tableSorter, setTableSorter] = React.useState({});
  const [expandedRowKeys, setExpandedKeys] = React.useState([]);
  const [allExpanded, setAllExpanded] = React.useState(false); // 新增状态来跟踪是否全部展开
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<string[] | undefined>(undefined);
  const [unSelectedRowKeys, setUnSelectedRowKeys] = React.useState<string[] | undefined>(undefined);
  const [selectionMode, setSelectionMode] = React.useState(selectionModeFromProp);
  const [selectAll, setSelectAll] = React.useState(false);
  const allSelectableRowKeysRef = React.useRef([]); // 用于虚拟全选
  const COLUMN_WIDTH_STORAGE_KEY = generateStorageKey(props.name, 'column-width');
  const PAGESIZE_STORAGE_KEY = generateStorageKey(props.name, 'default-pagesize');
  const EXPANDED_ROW_KEYS_STORAGE_KEY = generateStorageKey(props.name, 'expanded-row-keys');
  const [tableColumns, setTableColumns] = React.useState(useColumnSetting ? [] : columns);
  const [columnsWidth, setColumnsWidth] = useLocalStorageState(COLUMN_WIDTH_STORAGE_KEY, {
    defaultValue: {},
  });
  const [pagesize, setPageSize] = useLocalStorageState(PAGESIZE_STORAGE_KEY, {
    defaultValue: DEFAULT_PAGE_SIZE,
  });
  const [cachedExpandedRowKeys, setCachedExpandedRowKeys] = useLocalStorageState(
    EXPANDED_ROW_KEYS_STORAGE_KEY,
    {
      defaultValue: [],
    },
  );
  const ref = useRef(null);
  const size = useSize(ref);
  const { t } = useI18n();

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

  const tableColumnsDeps = useMemo(
    () =>
      (tableColumns || [])
        .map(i => i.key)
        .sort()
        .join(','),
    [tableColumns],
  );

  const refreshDeps = useMemo(
    () => [queryDeps || getDataSource, tableColumnsDeps],
    [queryDeps, getDataSource, tableColumnsDeps],
  );
  // console.log('查看表头', tableColumns, )
  const {
    tableProps: antdTableProps,
    refresh,
    mutate,
  } = useTable(
    async queryParams => {
      const { current, pageSize: _pageSize, tableColumns: _tableColumns } = queryParams;
      // 等待表头加载完，请求
      if (!queryParams || !tableColumns.length) return null;
      const fields = _tableColumns || tableColumns || [];
      const _current = current < 1 ? 1 : current;
      return await getDataSource?.(
        {
          offset: (_current - 1) * _pageSize,
          limit: _pageSize,
        },
        fields,
      );
    },
    {
      defaultPageSize: pagesize,
      refreshDeps,
      cacheKey,
      ignoreInit,
      onSuccess: data => {
        onSuccess?.(data, mutate);
      },
    },
  );

  const ColumnSettingMemorizedNode = React.useMemo(() => {
    if (!titleCellOption || !useColumnSetting) return null;
    return (
      <ColumnSetting
        name={props?.name}
        additionalColumns={columns}
        testFieldKeys={testFieldKeys}
        titleCellOption={titleCellOption}
        defaultColumnKey={defaultColumnKey}
        privateColumnKey={privateColumnKey}
        handleFilterField={props?.handleFilterField}
        onTableColumnChange={handleTableColumnChange}
        onClose={refresh}
        className={cx('column-setting', 'extra-column-setting', selectionMode ? 'hidden' : null)}
        getContainer={getContainer}
      />
    );
  }, [
    titleCellOption,
    useColumnSetting,
    props?.name,
    props?.handleFilterField,
    columns,
    testFieldKeys,
    defaultColumnKey,
    privateColumnKey,
    handleTableColumnChange,
    refresh,
    selectionMode,
  ]);

  const dataSource = React.useMemo(() => {
    const result = ((props.dataSource ?? antdTableProps.dataSource ?? []) as any[]).map(i => ({
      ...i,
      _tableState: {
        selectionMode,
      },
    }));

    const sortedResult = Object.values(tableSorter).reduce((arr: any[], item: any) => {
      const { sortOrder, sorter } = item;
      const sorterFunc = typeof sorter === 'function' ? sorter : sorter?.compare;
      if (typeof sorterFunc !== 'function') return arr;
      if (sortOrder === 'descend') return arr.sort((a, b) => sorterFunc(b, a));

      return arr.sort(sorterFunc);
    }, result);

    return sortedResult as any;
  }, [antdTableProps.dataSource, selectionMode, props.dataSource, tableSorter]);

  // 当前页可选的 row keys
  const currentPageSelectableRowKeys = React.useMemo(() => {
    return dataSource.map(data => data[props.rowKey as string]) ?? [];
  }, [dataSource, props.rowKey]);

  useEffect(() => {
    if (selectAll && virtualSelectAll) {
      setSelectedRowKeys([
        ...new Set(
          (selectedRowKeys ?? []).concat(
            currentPageSelectableRowKeys.filter(d => !unSelectedRowKeys?.includes(d)),
          ),
        ),
      ]);
      allSelectableRowKeysRef.current = [
        ...new Set(allSelectableRowKeysRef.current.concat(currentPageSelectableRowKeys)),
      ];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageSelectableRowKeys, selectAll, virtualSelectAll]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    antdTableProps?.pagination?.size,
    antdTableProps?.pagination?.total,
    antdTableProps?.pagination?.current,
  ]);

  React.useEffect(() => {
    // 数据源变更重置 selectedRowKeys
    if (Array.isArray(dataSource) && dataSource.length) {
      currentPageRowsRef.current = dataSource;
    }
  }, [dataSource]);

  React.useEffect(() => {
    onHasRowSelected?.(selectedRowKeys?.length > 0);
  }, [selectedRowKeys, onHasRowSelected]);

  const handleResize = useMemoizedFn((key, _e, { size }) => {
    setColumnsWidth(dict => ({
      ...dict,
      [key]: Math.max(MIN_COLUMN_WIDTH, size.width),
    }));
  });

  const handleSort = useMemoizedFn((key, e, props) => {
    const SortOrders = props.sortOrder ?? ['ascend', 'descend', null];
    setTableSorter(prev => ({
      ...prev,
      [key]: {
        sorter: props.sorter,
        sortOrder:
          SortOrders[Math.min(SortOrders.indexOf(prev?.[key]?.sorter) + 1, SortOrders.length - 1)],
      },
    }));
  });

  const columnsWithResizableAndSettingAction = React.useMemo(
    () =>
      tableColumns.map((col: any, index) => {
        const resizable = col.resizable ?? typeof col.width === 'number';
        const _col = omit(col, ['extraProps']);

        let title = _col.title;
        if (index === 0 && selectionMode && antdTableProps?.pagination?.total) {
          title = (
            <div className={cx('title-container')}>
              <div className={cx('current-page-text')}>
                {t('components.common.businessTable.checkCurrentPage')}
              </div>
              <div className={cx('dividing-line')} />
              <div>{title}</div>
            </div>
          );
        }

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
          title,
          resizable,
          width: resizable ? columnsWidth[col.key] ?? col.width : undefined,
          onCell: record =>
            ({
              ...cellOnClick(record, col),
              resizable,
              overflowEllipsis:
                typeof col.overflowEllipsis === 'boolean'
                  ? col.overflowEllipsis
                  : Boolean(resizable),
            } as any),
          onHeaderCell: column => ({
            ...column,
            width: column.width,
            onResize: handleResize.bind(null, col.key),
            onSort: handleSort.bind(null, col.key),
          }),
        };
      }),
    [
      columnsWidth,
      handleResize,
      handleSort,
      selectionMode,
      tableColumns,
      t,
      antdTableProps?.pagination?.total,
    ],
  );

  const SelectionActionHeader = useMemo(() => {
    if (!selectionMode) return null;
    const _allSelectedRowKeys = virtualSelectAll
      ? allSelectableRowKeysRef.current?.length
        ? allSelectableRowKeysRef.current
        : currentPageSelectableRowKeys
      : allSelectableRowKeys;
    const handleCheck = checked => {
      setSelectAll(checked);
      if (checked) {
        console.info(_allSelectedRowKeys);
        setSelectedRowKeys(_allSelectedRowKeys);
        setCheckedRowKeys?.(_allSelectedRowKeys);
        setUnSelectedRowKeys([]);
      } else {
        // 取差集
        setSelectedRowKeys([]);
        setCheckedRowKeys?.([]);
        setUnSelectedRowKeys(_allSelectedRowKeys);
      }
    };
    const handleClose = () => {
      setSelectionMode(false);
      onSelectionCancel?.();
    };
    const disableTableSelectAll = !Array.isArray(_allSelectedRowKeys);
    const selectNum = virtualSelectAll
      ? !selectAll
        ? selectedRowKeys?.length ?? 0
        : (antdTableProps?.pagination?.total ?? 0) - (unSelectedRowKeys?.length ?? 0)
      : selectedRowKeys?.length ?? 0;
    // 是否全等 rowKey
    const isSameWithAllRowKeys = virtualSelectAll
      ? !selectAll
        ? selectedRowKeys && selectedRowKeys.length >= (antdTableProps?.pagination?.total ?? 0)
        : !unSelectedRowKeys?.length
      : !difference(allSelectableRowKeys, selectedRowKeys).length;
    const allRowSelectionChecked = isSameWithAllRowKeys;
    // 有选中的值，但不全等全部 rowKey 则为半选
    const allRowSelectionIndeterminate =
      !isSameWithAllRowKeys && ((virtualSelectAll && selectAll) || !!selectedRowKeys?.length);

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
          selectNum={selectNum}
          actions={selectionActionNodes ?? []}
        />
      </div>
    );
  }, [
    allSelectableRowKeys,
    antdTableProps.loading,
    antdTableProps?.pagination?.total,
    currentPageSelectableRowKeys,
    expandable,
    onSelectionCancel,
    selectAll,
    selectedRowKeys,
    selectionActionNodes,
    selectionMode,
    setCheckedRowKeys,
    unSelectedRowKeys?.length,
    virtualSelectAll,
  ]);

  const PaginationFooter = useMemo(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [antdTableProps?.pagination, pagesize, showPagination]);

  const rowSelectionProp = useMemo(
    () =>
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
              const curUnselectedRowKeys =
                unSelectedRowKeys?.filter(d => !currentPageSelectableRowKeys.includes(d)) ?? [];

              const _rowKeys = new Set(rowKeys.concat(_selectedRowKeys));
              const _unselectRowKeys = new Set(
                currentPageSelectableRowKeys
                  .filter(d => !rowKeys.includes(d))
                  .concat(curUnselectedRowKeys),
              );

              setUnSelectedRowKeys([..._unselectRowKeys] as string[]);
              setSelectedRowKeys([..._rowKeys]);
              setCheckedRowKeys?.([..._rowKeys]);
            },
          }
        : undefined,
    [
      antdTableProps?.pagination?.total,
      currentPageSelectableRowKeys,
      selectedRowKeys,
      selectionMode,
      setCheckedRowKeys,
      unSelectedRowKeys,
    ],
  );

  const tableRefresh = useCallback(() => {
    refresh();
    setSelectAll(false);
    setSelectedRowKeys([]);
    setUnSelectedRowKeys([]);
  }, [refresh]);

  React.useImperativeHandle(
    actionRef,
    () => ({
      toggleSelection(visible = true) {
        setSelectionMode(visible);
      },
      refresh: tableRefresh,
      total: antdTableProps?.pagination?.total,
      selectAll,
      selectedRowKeys,
      unSelectedRowKeys,
      expandChangePage,
      dataSource,
      resetSelectedRowKeys: () => {
        setSelectedRowKeys(undefined);
        setUnSelectedRowKeys(undefined);
        setCheckedRowKeys?.([]);
        setSelectAll(false);
        allSelectableRowKeysRef.current = [];
      },
      tableColumns,
    }),
    [
      dataSource,
      tableRefresh,
      selectAll,
      selectedRowKeys,
      expandChangePage,
      tableColumns,
      setCheckedRowKeys,
      antdTableProps?.pagination?.total,
      unSelectedRowKeys,
    ],
  );

  // 解决values字段中的数据引用丢失问题
  const transferValueDataSource = useMemo(() => {
    if (!dataSource?.length) {
      return [];
    }
    return dataSource.map(item => {
      const finalValues = {
        ...item.values,
      };
      const testKeys = Object.keys(TestFiledKeyMapping);
      Object.keys(item).forEach(key => {
        if (testKeys.includes(key)) {
          finalValues[TestFiledKeyMapping[key]] = item[key];
        }
      });
      return {
        ...item,
        values: finalValues,
      };
    });
  }, [dataSource]);

  useDataQuoteStore(transferValueDataSource, ids =>
    getItemByIQL({
      itemId: ids,
    }).then(res => res.items),
  );

  React.useEffect(() => {
    if (!dataSource?.length) return;

    if (!initialExpandedRef.current) {
      // 只在初始加载时设置默认展开状态
      setAllExpanded(false);
      setExpandedKeys([dataSource[0]?.[props?.rowKey as string]]);
      initialExpandedRef.current = true;
    }
  }, [dataSource, props.rowKey, enableCacheEpandedRowKeys, cachedExpandedRowKeys]);

  return (
    <div className={`${cx('table-container')} table-box business-debug-table`} ref={ref}>
      {SelectionActionHeader}
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
                columnTitle: () => {
                  const iconStyle = {
                    color: '#878C96',
                    cursor: 'pointer',
                    transition: 'transform 0.3s ease',
                    transform: allExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  };
                  return (
                    <Tooltip
                      title={
                        allExpanded
                          ? t('page.repository.collapseAllCases')
                          : t('page.repository.expandAllCases')
                      }
                    >
                      <div
                        className={cx('table-columnTitle-icon')}
                        onClick={() => {
                          if (allExpanded) {
                            setExpandedKeys([]);
                            setCachedExpandedRowKeys([]);
                          } else {
                            const allKeys = dataSource.map(item => item[props.rowKey as string]);
                            setExpandedKeys(allKeys);
                            setCachedExpandedRowKeys(allKeys);
                          }
                          setAllExpanded(!allExpanded);
                        }}
                      >
                        <CaretRightOutlined style={iconStyle} />
                      </div>
                    </Tooltip>
                  );
                },
                indentSize: 2,
                expandIcon: ({ expanded, onExpand, record }) => {
                  const iconStyle = {
                    color: '#878C96',
                    transition: 'transform 0.3s ease',
                    transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  };
                  return (
                    <div
                      className={cx('table-columnTitle-icon')}
                      style={{ background: '#fff' }}
                      onClick={e => onExpand(record, e)}
                    >
                      <CaretRightOutlined style={iconStyle} />
                    </div>
                  );
                },
                ...expandable,
                fixed: true,
                expandedRowKeys,
                expandRowByClick: false,
                // onExpandedRowsChange: rows => setExpandedKeys(rows as any[]),
                onExpandedRowsChange: expandedRows => {
                  if (expandedRows?.length === dataSource?.length) {
                    setAllExpanded(true);
                  } else {
                    setAllExpanded(false);
                  }
                  setExpandedKeys(expandedRows as any[]);
                  // 保存展开状态到缓存
                  setCachedExpandedRowKeys(expandedRows as any[])
                },
              }
            : undefined
        }
        {...restTableProps}
      />
      {PaginationFooterRender ? <PaginationFooterRender /> : PaginationFooter}
    </div>
  );
};

export default React.memo(BusinessTable);
