import React from 'react';
import { Space, Button, Divider } from '@osui/ui';
import TestRunsTable from '@/pages/panel/TestDetail/components/runs/components/Table';

import css from './index.less';

const ExecutionPannel: React.FC = () => {
  return (
    <div className={css('exe')}>
      <div className={css('exe__handle')}>
        <Space>
          <Button type="primary">新增测试用例</Button>
          <Button type="primary">添加测试用例</Button>
        </Space>
      </div>

      <div className={css('exe__progress')}>
        <div className={css('exe__progress__around')}>
          <div className={css('exe__progress-outer')}>
            <div className={css('exe__progress-inner')}>
              <div className={css('exe__progress-bg')}>
                <div className={css('exe__progress-bg__success')}></div>
                <div className={css('exe__progress-bg__fail')}></div>
                <div className={css('exe__progress-bg__ing')}></div>
              </div>
            </div>
          </div>
        </div>

        <div className={css('exe__tips')}>
          <Space split={<Divider type="vertical" />}>
            <div>2个通过</div>
            <div>2个失败</div>
            <div>2个待执行</div>
          </Space>

          <div>总共测试用例有：22</div>
        </div>
      </div>

      <div className={css('exe__table')}>
        <TestRunsTable data="SzHLagi3vR"></TestRunsTable>
      </div>
    </div>
  );
};

export default ExecutionPannel;
