import React from 'react';
import { Button, Empty } from 'antd';
import emptyImg from '@/icons/svg/empty-data.png';

import cx from './index.less';

interface NoDataProps {
  createTestExecution?: (val?: boolean) => void;
}

const NoData: React.FC<NoDataProps> = ({ createTestExecution }) => {
  return (
    <div className={cx('no-data-box')}>
      <Empty description="暂无测试执行任务" image={emptyImg}>
        <Button
          type="primary"
          onClick={async () => {
            createTestExecution();
          }}
        >
          新建测试执行任务
        </Button>
      </Empty>
    </div>
  );
};

export default NoData;
