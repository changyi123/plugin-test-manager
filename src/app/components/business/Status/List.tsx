import React, { useMemo } from 'react';

import useI18n from '@/lib/hooks/useI18n';

import { useStatusConfig } from './hooks';
import cx from './List.less';
import { sequence } from './utils';

interface StatusListProps {
  onStatusChange?: (val: any, isStep?: boolean) => void;
  className?: string;
  status?: string;
  disabled?: boolean;
  disabledReason?: string;
}

const List: React.FC<StatusListProps> = ({ className, onStatusChange, status, disabled, disabledReason }) => {
  const { t } = useI18n();
  const statusConfig = useStatusConfig();

  const statusList = useMemo(() => {
    const filterStatus = [status ?? '', 'TODO'].filter(Boolean);
    return sequence(Object.values(statusConfig ?? [])).filter(d => !filterStatus.includes(d.key));
  }, [statusConfig, status]);

  const statusChange = val => {
    if (disabled) return;
    if (status === val.key) return;
    onStatusChange(val);
  };

  return (
    <div className={cx(className, 'status-list')} title={disabled ? disabledReason : undefined}>
      {statusList?.map(status => (
        <div
          className={cx('status', status.key, { disabled })}
          key={status.key}
          onClick={() => statusChange(status)}
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
        >
          {t(`status.${status.key}.name`)}
        </div>
      ))}
    </div>
  );
};

export default List;
