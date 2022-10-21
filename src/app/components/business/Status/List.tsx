import React, { useMemo } from 'react';
import { useStatusConfig } from './hooks';
import { sequence } from './utils';

import cx from './List.less';

interface StatusListProps {
  onStatusChange?: (val: any) => void;
  className?: string;
  status?: string;
}

const List: React.FC<StatusListProps> = ({ className, onStatusChange, status }) => {
  const statusConfig = useStatusConfig();

  const statusList = useMemo(() => {
    return sequence(Object.values(statusConfig ?? [])).filter(d => d.key !== 'TODO');
  }, [statusConfig]);

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
          {status.name}
        </div>
      ))}
    </div>
  );
};

export default List;
