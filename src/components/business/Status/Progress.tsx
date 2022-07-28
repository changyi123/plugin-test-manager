import React from 'react';
import _, { groupBy } from 'lodash';
import { Popover } from 'antd';
import { sequence } from './utils';
import { useStatusConfig } from './hooks';

import cx from './Progress.less';

const toStylePercent = number => {
  return `${Math.ceil(number * 100)}%`;
};

type StatusProgressProps = {
  className?: string;
  statuses?: string[];
  hasSummary?: boolean;
  onReady?: (statuses: any[]) => void;
};

const POPOVER_COLOR = '#4D545E';

const StatusProgress: React.FC<StatusProgressProps> = props => {
  const statusConfig = useStatusConfig();
  const [visible, setVisible] = React.useState(false);

  const total = props.statuses?.length ?? 0;

  const statuses = React.useMemo(() => {
    // 兼容不规范的 status key
    const statuses =
      props.statuses?.map(statusKey => (statusConfig[statusKey] ? statusKey : 'TODO')) ?? [];

    const groupedStatus = groupBy(statuses, String);

    if (!Object.keys(statusConfig).length || !total) {
      return [];
    }

    return sequence(
      _.chain(statuses)
        .uniq()
        .map(statusKey => {
          const status = statusConfig[statusKey];
          return {
            ...status,
            num: (groupedStatus[statusKey] ?? []).length,
          };
        })
        .value(),
    );
  }, [props.statuses, statusConfig, total]);

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
          <span className={cx('font')}>总和</span>
          <span className={cx('font', 'num')}>{total}</span>
        </h6>
      </div>
    );
  }, [props.hasSummary, statuses]);

  return (
    <Popover
      visible={visible}
      onVisibleChange={visible => props?.hasSummary && setVisible(visible)}
      content={PopoverContent}
      color={POPOVER_COLOR}
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
