import React from 'react';
import { omitBy } from 'lodash';
import { Popover } from 'antd';
import { sequence } from './utils';
import { useStatusConfig } from './hooks';
import { CaretDownOutlined } from '@ant-design/icons';
import { getRootContainer } from '@/lib/utils/helper';

import cx from './Badge.less';

type BadgeProps = {
  status?: string;
  showBg?: boolean;
  hideIcon?: boolean;
  readonly?: boolean;
  className?: string;
  useRootContainer?: boolean;
  emptyNode?: React.ReactNode;
  onStatusChange?: (status) => void;
  onReady?: (statusConfig) => void;
};

const Status = ({
  status,
  showBg,
  hideIcon,
  onClick,
  hasEffect,
  hoverStyle,
  className,
}: Partial<Record<string, any>>) => {
  if (!status) return null;
  return (
    <div
      onClick={() => onClick?.(status)}
      className={[
        cx('status', hoverStyle && 'hover', className),
        showBg && cx('run-status', status?.key),
        hideIcon && cx('hide-icon'),
        'status',
      ].join(' ')}
    >
      {!hideIcon && (
        <span style={{ background: status?.color }} className={cx('dot', 'status__dot')} />
      )}
      <span className={cx('name')}>{status?.name}</span>
      {hasEffect && (
        <span className={cx('icon')}>
          <CaretDownOutlined />
        </span>
      )}
    </div>
  );
};

const Badge: React.FC<BadgeProps> = props => {
  const badgeRef = React.useRef();
  const statusConfig = useStatusConfig();
  const isInitialRef = React.useRef(false);
  const currentStatus = React.useMemo(() => {
    return statusConfig[props.status] ?? (statusConfig as any).TODO;
  }, [props.status, statusConfig]);

  React.useEffect(() => {
    if (
      typeof props?.onReady !== 'function' ||
      !Object.keys(statusConfig).length ||
      isInitialRef.current
    )
      return;
    isInitialRef.current = true;
    props?.onReady(statusConfig);
  }, [statusConfig, props]);

  const [visible, setVisible] = React.useState(false);

  const PopoverContent = React.useMemo(() => {
    if (props.readonly) return null;
    const statuses = sequence(
      Object.values(
        omitBy(
          statusConfig as Record<string, any>,
          status => status.key === props.status || status.key === 'TODO',
        ),
      ),
    );

    return statuses.map(status => (
      <Status
        hoverStyle
        onClick={status => {
          setVisible(false);
          props?.onStatusChange(status);
        }}
        className={cx('block', 'status__block')}
        key={status.key}
        status={status}
        hideIcon={props.hideIcon}
      />
    ));
  }, [statusConfig, props]);

  return (
    <div className={props.className} ref={badgeRef}>
      <Popover
        getPopupContainer={props.useRootContainer ? getRootContainer : () => badgeRef.current}
        trigger="click"
        visible={visible}
        placement="bottomLeft"
        content={PopoverContent}
        onVisibleChange={visible => !props.readonly && setVisible(visible)}
        overlayClassName={cx('status-badge-overlay', 'status__overlay')}
      >
        {props.emptyNode ? (
          props.emptyNode
        ) : (
          <Status
            status={currentStatus}
            showBg={props.showBg}
            hasEffect={!props.readonly}
            className={cx('effect-status')}
            onClick={() => !props.readonly && setVisible(true)}
            hideIcon={props.hideIcon}
          />
        )}
      </Popover>
    </div>
  );
};

export default React.memo(Badge);
