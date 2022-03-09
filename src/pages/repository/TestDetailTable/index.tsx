/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import React from 'react';
import { Table, Row, Col } from '@osui/ui';
import { useDrag, useUpdateEffect } from 'ahooks';
import { ColumnProps } from 'antd/lib/table';
import cx from './index.less';
import { UsergroupAddOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';

type TestDetailTableProps = {
  total: number;
  dataSource: any[];
  loading?: boolean;
  selectedFolderKey?: string;
  onPageChange?: (current: number, pageSize: number) => void;
  openCopyCase?: () => void;
  openDeleteCase?: () => void;
  getSelData?: (params: string[]) => void;
  needClear: boolean;
};

const TestDetailTable: React.FC<TestDetailTableProps> = ({
  total,
  loading,
  dataSource,
  onPageChange,
  selectedFolderKey,
  openCopyCase,
  openDeleteCase, //打开删除case
  getSelData,
  needClear, //是否需要清除选中
}) => {
  const [pagination, setPagination] = React.useState({
    current: 1,
    pageSize: 20,
  });
  //选中行的操作
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<string[]>([]);

  React.useEffect(() => {
    setPagination(prev => ({
      ...prev,
      current: 1,
    }));
  }, [selectedFolderKey]);

  useUpdateEffect(() => {
    if (needClear) {
      setSelectedRowKeys([]); //将选中数据清空
    }
  }, [needClear]);

  // BodyRow component
  const BodyRow = props => {
    // 只有 data-row 可以拖拽, placeholder node 不能拖拽
    const DataRowComponent = props => {
      const ref = React.useRef(null);
      useDrag(
        {
          folderKey: selectedFolderKey,
          itemId: props['data-row-key'],
        },
        ref,
      );
      return <tr ref={ref} {...props} />;
    };

    const isDataRow = props['data-row-key'] != null;
    return isDataRow ? <DataRowComponent {...props} /> : <tr {...props} />;
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

  //row sel
  const onSelectChange = selectedRowKeys => {
    console.log('selectedRowKeys changed: ', selectedRowKeys);
    getSelData(selectedRowKeys); //send data
    setSelectedRowKeys(selectedRowKeys);
  };
  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };
  const columns: ColumnProps<any>[] = [
    {
      //PS:最开始这里放的是事项id
      title: () => {
        return (
          <div>
            <Row>
              <Col span={6}>
                <span className={cx('test_span')}>
                  <span>
                    已选中<span className={cx('test_span_color')}>{selectedRowKeys.length}</span>项
                  </span>
                  <span className={cx('test_span_line')}> | </span>
                </span>
              </Col>
              <Col span={6}>
                <span>
                  <UsergroupAddOutlined />
                  <span style={{ paddingLeft: 5 }}>设置负责人</span>
                </span>
              </Col>
              <Col span={6}>
                <span onClick={openCopyCase}>
                  <CopyOutlined />
                  <span style={{ paddingLeft: 5 }}>复制用例</span>
                </span>
              </Col>
              <Col span={6}>
                <span onClick={openDeleteCase}>
                  <DeleteOutlined />
                  <span style={{ paddingLeft: 5 }}>删除用例</span>
                </span>
              </Col>
            </Row>
          </div>
        );
      },
      width: 420,
      key: 'key',
      render(_, record) {
        return record.reference.key;
      },
    },
    {
      key: 'name',
      render(_, record) {
        return record.reference.name;
      },
    },
    {
      key: 'status',
      render() {
        return null;
      },
    },
    {
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
      rowSelection={rowSelection} //row sel
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
