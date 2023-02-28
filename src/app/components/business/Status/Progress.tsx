import React from 'react';
import _ from 'lodash';
import { Popover } from 'antd';
import { sequence } from './utils';
import { useStatusConfig } from './hooks';
import useI18n from '@/lib/hooks/useI18n';

import cx from './Progress.less';

const toStylePercent = number => {
  return `${Math.round(number * 10000) / 100}%`;
};

type StatusProgressProps = {
  className?: string;
  statuses?: string[];
  status?: Record<string, number>;
  hasSummary?: boolean;
  onReady?: (statuses: any[]) => void;
};

const POPOVER_COLOR = '#4D545E';

const StatusProgress: React.FC<StatusProgressProps> = props => {
  const { t } = useI18n();
  const statusConfig = useStatusConfig();
  const [visible, setVisible] = React.useState(false);

  const total =
    props.status &&
    Object.values(props.status).reduce((prev: number, cur: number) => {
      prev = prev + cur;
      return prev;
    }, 0);

  const statuses = React.useMemo(() => {
    if (!Object.keys(statusConfig).length || !total) {
      return [];
    }

    return sequence(
      _.chain(Object.keys(props.status))
        .uniq()
        .map(statusKey => {
          const status = statusConfig[statusKey];
          return {
            ...status,
            num: props.status?.[statusKey],
          };
        })
        .value(),
    );
  }, [props.status, statusConfig, total]);

  React.useEffect(() => {
    props.onReady?.(statuses);
  }, [statuses, props]);

  const PopoverContent = React.useMemo(() => {
    if (!props.hasSummary) return undefined;
    return (
      <div className={cx('summary')}>
        <ul>
          {statuses.map(status => (
            <li key={status.key} className={cx('item')}>
              <span className={cx('dot')} style={{ background: status.color }} />
              <span className={cx('font')}>{status.name}</span>
              <span className={cx('font', 'num')}>{status.num}</span>
            </li>
          ))}
        </ul>
        <h6 className={cx(`${total === 0 ? 'total-null' : ''}`)}>
          <span className={cx('font')}>{t('components.business.status.total')}</span>
          <span className={cx('font', 'num')}>{total}</span>
        </h6>
      </div>
    );
  }, [props.hasSummary, statuses, total, t]);

  return (
    <Popover
      open={visible}
      onOpenChange={visible => props?.hasSummary && setVisible(visible)}
      content={PopoverContent}
      color={POPOVER_COLOR}
      overlayClassName={cx('test-entity-status')}
    >
      <div className={cx('progress')}>
        {statuses.map(status => (
          <span
            className={cx('progress-item')}
            style={{
              width: toStylePercent(status.num / total),
              background: status.color,
            }}
            key={status.key}
          ></span>
        ))}
      </div>
    </Popover>
  );
};

export default React.memo(StatusProgress);
