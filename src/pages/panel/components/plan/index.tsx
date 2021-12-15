import React from 'react';
import { BaseTable } from '@/components/common/Table';

const Plan = () => {
  return (
    <div style={{ height: 400 }}>
      <BaseTable
        rowKey="key"
        data={[
          { key: 1, name: '1' },
          { key: 2, name: '2' },
        ]}
        select={{ onSelect: console.log }}
      ></BaseTable>
    </div>
  );
};

export default React.memo(Plan);
