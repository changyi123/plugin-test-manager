import { ColumnProps } from 'antd/lib/table';

export type BuiltinTableColumn<TRecord = any> = ColumnProps<TRecord> & {
  cellRenderer: (data: Record<string, any>) => React.ReactNode;
};

type ColumnBuilder = <TRecord = any>(
  column: BuiltinTableColumn<TRecord>,
  renderData?: (data: TRecord, index: number) => Record<string, any>,
) => ColumnProps<TRecord>;

export const columnBuilder: ColumnBuilder = (column, renderData) => {
  return Object.assign({}, column, {
    render(_, record, index) {
      const data = renderData(record, index);
      return column.cellRenderer(data ?? {});
    },
  });
};
