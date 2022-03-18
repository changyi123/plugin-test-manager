import React from 'react';
import { Typography } from '@osui/ui';
import { goToItemDetailPage } from '@/lib/utils/helper';
import OverflowTooltip from '@/components/common/OverflowTooltip';

import cx from './style.less';

/** 事项 id */
export const ItemKey = {
  title: '事项ID',
  width: 170,
  cellRenderer({ item }) {
    if (!item) return <span style={{ color: '#ccc' }}>事项已被删除</span>;
    return (
      <OverflowTooltip title={item?.key}>
        <Typography.Link
          target="_blank"
          className={cx('item-key')}
          onClick={() =>
            goToItemDetailPage({
              workspaceKey: item?.workspace?.key,
              itemKey: item?.key,
            })
          }
        >
          {item?.key}
        </Typography.Link>
      </OverflowTooltip>
    );
  },
};

/** 事项标题 */
export const ItemTitle = {
  title: '标题',
  width: 160,
  cellRenderer({ item }) {
    if (!item) return <span style={{ color: '#ccc' }}>事项已被删除</span>;
    return <Typography.Text ellipsis={{ tooltip: item?.name }}>{item?.name}</Typography.Text>;
  },
};
