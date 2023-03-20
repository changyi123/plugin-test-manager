import React from 'react';
import { StatusProgress } from '@/components/business/Status';
import useI18n from '@/lib/hooks/useI18n';

import cx from './index.less';

type StatusProcessBarProps = {
  className?: string;
  status?: Record<string, number>;
};

const StatusProcessBar: React.FC<StatusProcessBarProps> = ({ status, className }) => {
  const { t } = useI18n();
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
            <span className={cx('name')}>{t(`status.${status.key}.name`)}</span>
          </span>
        ))}
        <span className={cx('total')}>
          <span className={cx('name')}>{t('components.business.statusProcessBar.caseCount')}</span>
          <span className={cx('num')}>{total}</span>
        </span>
      </div>
      <StatusProgress onReady={setGroupedStatuses} status={status} />
    </div>
  );
};

export default StatusProcessBar;
