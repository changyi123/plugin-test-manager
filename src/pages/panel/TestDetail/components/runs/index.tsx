import React from 'react';
import { Button, Space } from '@osui/ui';
import AddTestExecutionModal from './components/AddTestExecutionModal';
import ExtendTestExecutionModal from './components/ExtendTestExecutionModal';
import Table from './components/Table';

import css from './index.less';

const Runs: React.FC = () => {
  const itemId: string = window?.QiankunProps?.context?.itemId || 'tjn7zKxmj4';
  return (
    <div className={css('runs')}>
      <div className={css('runs__new')}>
        <Space>
          <AddTestExecutionModal
            trigger={<Button type="primary">新增测试执行</Button>}
            itemId={itemId}
          />
          <ExtendTestExecutionModal
            trigger={<Button type="primary">继承测试执行</Button>}
            itemId={itemId}
          />
        </Space>
      </div>

      <div className={css('runs__content')}>
        <Table itemId={itemId} />
      </div>
    </div>
  );
};

export default Runs;
