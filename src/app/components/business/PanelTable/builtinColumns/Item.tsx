import React from 'react';
import { Typography } from 'antd';
import { goToItemDetailPage } from '@/lib/utils/helper';
import OverflowTooltip from '@/components/common/OverflowTooltip';

import cx from './style.less';

/** 事项 id */
export const getItemKey = t => ({
  title: 'Key',
  width: 170,
  cellRenderer({ item }) {
    if (!item)
      return (
        <span style={{ color: '#ccc' }}>{t('components.business.panelTable.itemDeleted')}</span>
      );
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
});

/** 事项标题 */
export const getItemTitle = t => ({
  title: t('common.title'),
  width: 160,
  cellRenderer({ item }) {
    if (!item)
      return (
        <span style={{ color: '#ccc' }}>{t('components.business.panelTable.itemDeleted')}</span>
      );
    return <Typography.Text ellipsis={{ tooltip: item?.name }}>{item?.name}</Typography.Text>;
  },
});
