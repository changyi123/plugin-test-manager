import React from 'react';
import { omitBy } from 'lodash';
import { Popover } from '@osui/ui';
import { sequence } from './utils';
import { useStatusConfig } from './hooks';

import cx from './Badge.less';

type BadgeProps = {
  status?: string;
  readonly?: boolean;
  onStatusChange?: (status) => void;
  notCurrent?: boolean;
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
  const badgeRef = React.useRef();
  const statusConfig = useStatusConfig();
  const currentStatus = React.useMemo(() => {
    return statusConfig[props.status] ?? (statusConfig as any).TODO;
  }, [props.status, statusConfig]);
  const [visible, setVisible] = React.useState(false);

  const PopoverContent = React.useMemo(() => {
    if (props.readonly) return null;
    const statuses = sequence(
      Object.values(
        omitBy(statusConfig as Record<string, any>, status => status.key === props.status),
      ),
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
    <div ref={badgeRef}>
      <Popover
        getPopupContainer={props.notCurrent ? undefined : () => badgeRef.current}
        trigger="click"
        visible={visible}
        placement="bottomLeft"
        content={PopoverContent}
        onVisibleChange={visible => !props.readonly && setVisible(visible)}
        overlayClassName={cx('status-badge-overlay')}
      >
        <Status
          status={currentStatus}
          hasEffect={!props.readonly}
          onClick={() => !props.readonly && setVisible(true)}
        />
      </Popover>
    </div>
  );
};

export default React.memo(Badge);
