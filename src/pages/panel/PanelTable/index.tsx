import React from 'react';
import { useAntdTable } from 'ahooks';
import { Table } from '@osui/ui';

type PanelTableProps = {};

const PanelTable: React.FC<PanelTableProps> = () => {
  return <Table />;
};

export default React.memo(PanelTable);

// const dataSource: Array<RunItem> = [
//     {
//       key: 'IREP-47',
//       name: '测试用例111',
//       status: 'todo',
//     },
//     {
//       key: 'IREP-49',
//       name: '测试2222',
//       status: 'ing',
//     },
//   ];
//   const columns: ColumnsType<RunItem> = [
//     {
//       title: '序号',
//       render: (value, item, index) => (page - 1) * 10 + index + 1,
//     },
//     {
//       title: '密钥',
//       key: 'key',
//       dataIndex: 'key',
//       render: value => <Typography.Link href="#">{value}</Typography.Link>,
//     },
//     {
//       title: '摘要',
//       dataIndex: 'name',
//       key: 'name',
//     },
//     {
//       title: '状态',
//       dataIndex: 'status',
//       key: 'status',
//       render: value => <TestTableStatus status={value} />,
//     },
//     {
//       title: '执行',
//       render: () => (
//         <Button size="small" type="primary" href="#/testRun" icon={<CaretRightOutlined />}>
//           执行
//         </Button>
//       ),
//     },
//     {
//       title: '操作',
//       key: 'action',
//       render: value => <ActionBtn id={value} />,
//     },
//   ];
//   const { data, error, loading } = useRequest(() => GetTestRunsById(id));
//   if (error) {
//     return <div>加载失败,原因{error?.message}</div>;
//   }
//   if (loading) {
//     return <Spin tip="加载中..."></Spin>;
//   }
//   // if (!data?.data?.length) {
//   //   return <Empty description="测试运行为空，请创建测试执行"></Empty>;
//   // }
//   return (
//     <Table<RunItem>
//       dataSource={dataSource}
//       columns={columns}
//       pagination={{
//         onChange(current) {
//           setPage(current);
//         },
//       }}
//     />
//   );
