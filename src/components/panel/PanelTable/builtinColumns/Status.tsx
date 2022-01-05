import React from 'react';
import { StatusBadge } from '@/components/common/Status';

/** 最新执行状态 */
export const LatestStatus = {
  width: 140,
  key: 'status',
  title: '最新执行状态',
  dataIndex: 'status',
  cellRenderer(props) {
    return <StatusBadge {...props} />;
  },
};
