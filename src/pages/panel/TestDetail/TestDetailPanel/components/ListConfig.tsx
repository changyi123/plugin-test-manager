import React from 'react';
import {
  ShrinkOutlined,
  CopyOutlined,
  SwapOutlined,
  DeleteOutlined,
  ArrowsAltOutlined,
  EllipsisOutlined,
} from '@ant-design/icons';

export enum IStepToolsKey {
  OPEN = 'open',
  CLOSE = 'close',
  COPY = 'copy',
  MOVE = 'move',
  DELETE = 'delete',
  MORE = 'more',
}

export interface IStepObj {
  label: string;
  icon: React.ReactNode;
}

export type IStepTools = {
  [key in IStepToolsKey]: IStepObj;
};

export const stepTools: IStepTools = {
  open: {
    label: '展开',
    icon: <ArrowsAltOutlined />,
  },
  close: {
    label: '缩小',
    icon: <ShrinkOutlined />,
  },
  copy: {
    label: '复制',
    icon: <CopyOutlined />,
  },
  move: {
    label: '移动',
    icon: <SwapOutlined rotate={90} />,
  },
  delete: {
    label: '删除',
    icon: <DeleteOutlined />,
  },
  more: {
    label: '更多',
    icon: <EllipsisOutlined />,
  },
};
