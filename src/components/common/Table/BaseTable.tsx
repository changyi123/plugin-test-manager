import React from 'react';
import { Checkbox } from '@osui/ui';
import { BaseTableProps as OBaseTableProps, ColumnShape } from 'react-base-table';
import { isFunction, isEqual } from 'lodash';
import { useProximaTableToolkit } from './hooks';

type BaseTableProps = Omit<OBaseTableProps, 'width'> & {
  select?: {
    value?: [];
    onSelect: (data) => void;
  };
};

// 内置列
type BuiltinType = 'Checkbox' | 'Field' | 'FieldTitle';
const BaseTable: React.FC<BaseTableProps> = baseTableProps => {
  const {
    components: { Table, AutoResizer, TableCell },
    methods: { getTableColumns },
  } = useProximaTableToolkit();

  const {
    columns: columnsProp,
    select,
    data,
    width,
    height,
    rowKey = 'objectId',
    rowWidth = 120,
    ...restProps
  } = baseTableProps;

  const selectedRowRef = React.useRef([]);

  const { current: builtinColumns } = React.useRef({
    Checkbox: {
      width: 50,
      key: 'Checkbox',
      resizable: false,
      render: ({ rowData }, { select }) => {
        const handleChange = e => {
          const curValue = Array.isArray(select.value) ? select.value : selectedRowRef.current;
          const selected = e.target.checked
            ? curValue.concat(rowData)
            : curValue.filter(val => !isEqual(val, rowData));
          selectedRowRef.current = selected;
          select.onSelect(selected, e.target.checked);
        };

        const checkboxProps = Array.isArray(select.value)
          ? {
              checked: select.value.some(val => isEqual(val, rowData)),
            }
          : {};

        return <Checkbox {...checkboxProps} onChange={handleChange} />;
      },
    },
    Field: {
      width: 140,
      key: 'Field',
      render({ rowData, column }) {
        return (
          <TableCell
            readonly
            data={column?.data}
            id={rowData.objectId}
            dataIndex={column.key}
            type={column?.cellType}
            values={rowData?.values}
            property={column?.property}
            text={rowData?.[column.key] ?? rowData?.values?.[column.key]}
          />
        );
      },
    },
    FieldTitle: {
      width: 140,
      key: 'FieldTitle',
      render({ rowData }) {
        return rowData.name;
      },
    },
  } as Record<BuiltinType, ColumnShape>);

  const columns = React.useMemo(() => {
    const leftColumns = []
      .concat(isFunction(select?.onSelect) && builtinColumns.Checkbox)
      .filter(Boolean);
    const columns = leftColumns.concat(columnsProp);
    return columns.map(_column => {
      const column = Object.assign(
        {
          resizable: true,
          width: rowWidth,
        },
        _column,
      );

      if (column.type === 'field') {
        return {
          ...builtinColumns.Field,
          ...column,
        };
      }
      return column;
    });
  }, [builtinColumns.Checkbox, builtinColumns.Field, columnsProp, rowWidth, select?.onSelect]);

  const components = React.useMemo(() => {
    const CustomTableCell = cellProps => {
      const { column, rowData } = cellProps;
      if (column.render) {
        return column.render(cellProps, baseTableProps) || null;
      }
      return rowData && rowData[column?.dataKey] ? rowData[column?.dataKey] : null;
    };

    return {
      TableCell: CustomTableCell,
    };
  }, [baseTableProps]);

  return (
    <AutoResizer width={width} height={height}>
      {({ width, height }) => (
        <Table
          {...restProps}
          data={data}
          width={width}
          rowKey={rowKey}
          height={height}
          columns={columns}
          components={components}
        />
      )}
    </AutoResizer>
  );
};

export default React.memo(BaseTable);
