import React from 'react';
import { useProximaTableToolkit } from './hooks';

/**
 * 表格组件
 */
const BaseTable: React.FC = () => {
  const {
    components: { Table },
  } = useProximaTableToolkit();
  return <Table className="table-112"></Table>;
};

export default React.memo(BaseTable);
