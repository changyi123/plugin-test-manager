import React from 'react';

interface TestEntityListProps {
  testReport?: any; // 选中用例库
  testPlan?: string; // 选中测试计划
  testExecutin?: string; // 选中测试执行任务
  workspace: string; // 当前空间 key
  viewType: 'flat' | 'folder'; // 视图类型，平面视图：flat 和文件夹视图：folder
  operate?: boolean; // 是否批量操作
  selectIds?: string[]; // 批量操作情况下选中的用例 id
  search?: string; // 搜索关键字
  columns?: any[]; // 表格列是否需要?
}

// 实现功能：拖拽功能,选中功能

const TestEntityList: React.FC<TestEntityListProps> = () => {
  return <>111</>;
};

export default TestEntityList;
