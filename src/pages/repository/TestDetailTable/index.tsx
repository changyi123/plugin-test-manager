import React from 'react';
import { Table } from '@osui/ui';
import { useDrag } from 'ahooks';
import { ColumnProps } from 'antd/lib/table';
import { BuiltinColumns, columnBuilder } from '@/components/panel/PanelTable';

type TestDetailTableProps = {
  selectedFolderKey?: string;
  dataSource: any[];
};

const TestDetailTable: React.FC<TestDetailTableProps> = ({ dataSource, selectedFolderKey }) => {
  // BodyRow component
  const BodyRow = props => {
    const ref = React.useRef(null);
    useDrag(
      {
        folderKey: selectedFolderKey,
        itemId: props['data-row-key'],
      },
      ref,
    );
    return <tr ref={ref} {...props}></tr>;
  };

  const components = {
    body: {
      row: BodyRow,
    },
  };
  const columns: ColumnProps<any>[] = [
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
