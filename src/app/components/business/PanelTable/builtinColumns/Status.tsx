import React from 'react';
import { StatusBadge } from '@/components/business/Status';

/** 最新执行状态 */
export const getLatestStatus = t => ({
  width: 130,
  key: 'status',
  title: t('components.business.panelTable.newRunStatus'),
  dataIndex: 'status',
  cellRenderer(props) {
    return <StatusBadge {...props} />;
  },
});
