import React from 'react';
import { Typography } from '@osui/ui';

import cx from './style.less';

/** 事项 id */
export const ItemKey = {
  title: '事项ID',
  cellRenderer({ item }) {
    if (!item) return <span style={{ color: '#ccc' }}>关联的事项已被删除</span>;
    return (
      <Typography.Link
        ellipsis={true}
        target="_blank"
        className={cx('item-key')}
        // 租户处理
        href={`/osc/workspaces/${item?.workspace?.key}/item/${item?.key}`}
      >
        {item?.key}
      </Typography.Link>
    );
  },
};

/** 事项标题 */
export const ItemTitle = {
  title: '标题',
  cellRenderer({ item }) {
    if (!item) return <span style={{ color: '#ccc' }}>关联的事项已被删除</span>;
    return <Typography.Text ellipsis={{ tooltip: item?.name }}>{item?.name}</Typography.Text>;
  },
};
