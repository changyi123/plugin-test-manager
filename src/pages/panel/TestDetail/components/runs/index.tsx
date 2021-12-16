import React from 'react';
import { Button, Space } from '@osui/ui';
import AddTestExecutionModal from './components/AddTestExecutionModal';
import Table from './components/Table';

import css from './index.less';

const Runs: React.FC = () => {
  return (
    <div className={css('runs')}>
      <div className={css('runs__new')}>
        <Space>
          <AddTestExecutionModal trigger={<Button type="primary">新增测试执行</Button>} />
          <Button type="primary">继承测试执行</Button>
        </Space>
      </div>

      <div className={css('runs__content')}>
        <Table id="beAxtdQda1" />
      </div>
    </div>
  );
};

export default Runs;
