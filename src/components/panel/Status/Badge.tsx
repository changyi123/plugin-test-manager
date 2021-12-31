import React from 'react';
import { omitBy } from 'lodash';
import { Popover } from '@osui/ui';
import { useStatusConfig } from './hooks';

import cx from './Badge.less';

type BadgeProps = {
  status?: string;
  readonly?: boolean;
  onStatusChange?: (status) => void;
};

const Status = ({ status, hasEffect, onClick, className }: Partial<Record<string, any>>) => {
  if (!status) return null;
  return (
    <div
      onClick={() => onClick?.(status)}
      className={cx('status', hasEffect && 'hover', className)}
    >
      <span style={{ background: status?.color }} className={cx('dot')} />
      <span className={cx('name')}>{status?.name}</span>
    </div>
  );
};

const Badge: React.FC<BadgeProps> = props => {
  const statusConfig = useStatusConfig();
  const currentStatus = statusConfig[props.status];
  const [visible, setVisible] = React.useState(false);

  const PopoverContent = React.useMemo(() => {
    const statuses = Object.values(
      omitBy(statusConfig as Record<string, any>, status => status.key === props.status),
    );

    return statuses.map(status => (
      <Status
        hasEffect
        onClick={status => {
          setVisible(false);
          props?.onStatusChange(status);
        }}
        className={cx('block')}
        key={status.key}
        status={status}
      />
    ));
  }, [statusConfig, props]);

  return (
    <Popover
      trigger="click"
      visible={visible}
      placement="bottom"
      content={PopoverContent}
      onVisibleChange={setVisible}
      overlayClassName={cx('status-badge-overlay')}
    >
      <Status onClick={() => setVisible(true)} hasEffect={!props.readonly} status={currentStatus} />
    </Popover>
  );
};

export default React.memo(Badge);
