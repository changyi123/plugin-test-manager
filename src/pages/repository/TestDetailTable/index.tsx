import React from 'react';
import { Table } from '@osui/ui';
import { useDrag } from 'ahooks';
import { ColumnProps } from 'antd/lib/table';
import { BuiltinColumns, columnBuilder } from '@/components/panel/PanelTable';

type TestDetailTableProps = {
  total: number;
  dataSource: any[];
  loading?: boolean;
  selectedFolderKey?: string;
  onPageChange?: (current: number, pageSize: number) => void;
};

const TestDetailTable: React.FC<TestDetailTableProps> = ({
  total,
  loading,
  dataSource,
  onPageChange,
  selectedFolderKey,
}) => {
  const [pagination, setPagination] = React.useState({
    current: 1,
    pageSize: 20,
  });
  React.useEffect(() => {
    setPagination(prev => ({
      ...prev,
      current: 1,
    }));
  }, [selectedFolderKey]);
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

  const handlePageChange = React.useCallback(
    (current, pageSize) => {
      setPagination({
        current,
        pageSize,
      });
      onPageChange(current, pageSize);
    },
    [onPageChange],
  );

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
      sticky
      loading={loading}
      components={components}
      pagination={{
        ...pagination,
        total,
        size: 'small',
        defaultPageSize: 20,
        showSizeChanger: true,
        hideOnSinglePage: true,
        onChange: handlePageChange,
        showTotal: total => <span>共 {total} 个测试用例</span>,
      }}
      rowKey="objectId"
      columns={columns}
      dataSource={dataSource}
    />
  );
};

export default React.memo(TestDetailTable);
