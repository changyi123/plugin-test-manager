import React from 'react';
import cx from './index.less';
import { useAntdTable } from 'ahooks';
import { Checkbox, Pagination, Spin } from '@osui/ui';
import Table, { BaseTableProps, AutoResizer, Column } from 'react-base-table';

import 'react-base-table/styles.css';

const DefaultPageSize = 20;
const DefaultRowHeight = 40;
const DefaultFooterHeight = 48;

export type ActionType = {
  refresh: () => void;
  toggleSelection: (visible?: boolean) => void;
};

const SelectionCell = ({ rowData, rowIndex, column }) => {
  const { onChange, selectedRowKeys, rowKey } = column;

  const handleChange = e => {
    onChange({ selected: e.target.checked, rowData, rowIndex });
  };

  const checked = selectedRowKeys.includes(rowData[rowKey]);

  return <Checkbox className={cx('checkbox-cell')} checked={checked} onChange={handleChange} />;
};

type BusinessTableProps = Omit<BaseTableProps, 'width' | 'data'> & {
  getDataSource?: (queryParams: { offset: number; limit: number }) => Promise<{
    list: any[];
    total: number;
  } | null>;
  actionRef?: React.ForwardedRef<ActionType>;
  renderSelectionActionHeader?: (args: {
    selectedRowKeys: string[];
    toggleAllRowsChecked: (checked?: boolean) => void;
  }) => React.ReactNode;
};

const BusinessTable: React.FC<BusinessTableProps> = props => {
  const { actionRef, renderSelectionActionHeader, columns, getDataSource, ...restTableProps } =
    props;
  const [selectedRowKeys, setSelectedRowKeys] = React.useState([]);
  const [selectionMode, setSelectionMode] = React.useState(false);

  const handleSelectChange = ({ rowData, selected }) => {
    const key = rowData[props.rowKey];
    setSelectedRowKeys(keys => (selected ? keys.concat(key) : keys.filter(k => k !== key)));
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
    }
  }, [setSelectedRowKeys, antdTableProps.dataSource]);

  const SelectionColumn = {
    width: 46,
    flexShrink: 0,
    resizable: false,
    key: '__selection__',
    rowKey: props.rowKey,
    cellRenderer: SelectionCell,
    onChange: handleSelectChange,
    selectedRowKeys: selectedRowKeys,
    frozen: Column.FrozenDirection.LEFT,
  };

  const columnsWithResizable = columns.map(col => ({ resizable: true, minWidth: 40, ...col }));
  const tableColumnsProp = selectionMode
    ? [SelectionColumn].concat(columnsWithResizable)
    : columnsWithResizable;

  const headerRenderer = ({ cells }) => {
    if (!selectionMode) return cells;
    const node = renderSelectionActionHeader?.({
      selectedRowKeys,
      toggleAllRowsChecked: (checked = true) => {
        if (checked === false) {
          setSelectedRowKeys([]);
        } else {
          const allRowKeys = antdTableProps.dataSource.map(item => item[props.rowKey]);
          setSelectedRowKeys(allRowKeys);
        }
      },
    });
    if (node) return <div className={cx('selection-header')}>{node}</div>;
  };

  const footerRenderer = () => {
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
          showSizeChanger={false}
          className={cx('pagination')}
          defaultPageSize={DefaultPageSize}
          onChange={handlePaginationChange}
          {...pagination}
        />
      </div>
    );
  };

  React.useImperativeHandle(actionRef, () => ({
    toggleSelection(visible = true) {
      setSelectionMode(visible);
    },
    refresh,
  }));

  if (antdTableProps.dataSource.length === 0) {
    // return <Empty description="暂无数据" />;
  }

  return (
    <AutoResizer className={cx('table-container')}>
      {({ width, height }) => (
        <Table
          width={width}
          height={height}
          columns={tableColumnsProp}
          rowHeight={DefaultRowHeight}
          headerRenderer={headerRenderer}
          footerRenderer={footerRenderer}
          headerHeight={DefaultRowHeight}
          data={antdTableProps.dataSource}
          footerHeight={DefaultFooterHeight}
          overlayRenderer={() => <Spin spinning={antdTableProps.loading} />}
          {...restTableProps}
        />
      )}
    </AutoResizer>
  );
};

export { Column };
export default React.memo(BusinessTable);
