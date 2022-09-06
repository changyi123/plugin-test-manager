import React from 'react';
import { StatusProgress } from '@/components/business/Status';

import cx from './index.less';

type StatusProcessBarProps = {
  className?: string;
  statuses: string[];
};

const StatusProcessBar: React.FC<StatusProcessBarProps> = ({ statuses, className }) => {
  const [groupedStatues, setGroupedStatuses] = React.useState([]);
  const total = groupedStatues.reduce((total, item) => (total += item.num), 0);

  return (
    <div className={cx('status-bar', className)}>
      <div className={cx('summary')}>
        {groupedStatues.map(status => (
          <span className={cx('item')} key={status.key}>
            <span className={cx('num')} style={{ color: status.color }}>
              {status.num}
            </span>
            <span className={cx('name')}>{status.name}</span>
          </span>
        ))}
        <span className={cx('total')}>
          <span className={cx('name')}>用例总数</span>
          <span className={cx('num')}>{total}</span>
        </span>
      </div>
      <StatusProgress onReady={setGroupedStatuses} statuses={statuses} />
    </div>
  );
};

export default StatusProcessBar;
