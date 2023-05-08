import React, { useMemo } from 'react';

import useI18n from '@/lib/hooks/useI18n';

import { useStatusConfig } from './hooks';
import cx from './List.less';
import { sequence } from './utils';

interface StatusListProps {
  onStatusChange?: (val: any, isStep?: boolean) => void;
  className?: string;
  status?: string;
}

const List: React.FC<StatusListProps> = ({ className, onStatusChange, status }) => {
  const { t } = useI18n();
  const statusConfig = useStatusConfig();

  const statusList = useMemo(() => {
    const filterStatus = [status ?? '', 'TODO'].filter(Boolean);
    return sequence(Object.values(statusConfig ?? [])).filter(d => !filterStatus.includes(d.key));
  }, [statusConfig, status]);

  const statusChange = val => {
    if (status === val.key) return;
    onStatusChange(val);
  };

  return (
    <div className={cx(className, 'status-list')}>
      {statusList?.map(status => (
        <div
          className={cx('status', status.key)}
          key={status.key}
          onClick={() => statusChange(status)}
        >
          {t(`status.${status.key}.name`)}
        </div>
      ))}
    </div>
  );
};

export default List;
