import React from 'react';
import { Table } from '@osui/ui';
import { useDrag } from 'ahooks';
import { ColumnProps } from 'antd/lib/table';
import { BuiltinColumns, columnBuilder } from '@/components/panel/PanelTable';

const BodyRow = props => {
  const ref = React.useRef(null);
  useDrag(
    {
      itemId: props['data-row-key'],
    },
    ref,
  );
  return <tr ref={ref} {...props}></tr>;
};

type TestDetailTableProps = {
  dataSource: any[];
};

const TestDetailTable: React.FC<TestDetailTableProps> = ({ dataSource }) => {
  console.info(JSON.parse(JSON.stringify(dataSource)));
  const components = {
    body: {
      row: BodyRow,
    },
  };
  const columns: ColumnProps<any>[] = [
    {
      width: 20,
      fixed: true,
      render() {
        return 11;
      },
    },
    columnBuilder(BuiltinColumns.ItemKey, item => ({ item })),
    columnBuilder(BuiltinColumns.ItemTitle, item => ({ item })),
    {
      title: '状态',
      key: 'status',
      render() {
        return null;
      },
    },
    {
      title: '执行人',
      key: '',
      render() {
        return null;
      },
    },
  ];
  return (
    <Table
      components={components}
      pagination={{
        onChange() {},
      }}
      rowKey="objectId"
      columns={columns}
      dataSource={dataSource}
    />
  );
};

export default React.memo(TestDetailTable);
