import React from 'react';
import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { EventEmitter } from 'ahooks/lib/useEventEmitter';

export type TestConfigContextType = {
  config: {
    // 测试类型 和 itemType 类型关联
    itemTypeMap: Record<TestType, 'string'>;
  };
  workspaceKey: string;
};
/** 测试管理配置 context */
export const TestConfigContext = React.createContext<TestConfigContextType>(
  {} as TestConfigContextType,
);

export type BaseActionContextType = {
  /** 创建事项 */
  createItem: (params: { type: TestType; extraData?: Record<string, any> }) => void;
  /** 获取测试管理实体 */
  getTestEntity: (itemId: string) => Parse.Object<TestEntity>;
  /** 打开事项 panel */
  openItemViewPanel: (itemId: string) => void;
};
/** proxima 操作 context */
export const BaseActionContext = React.createContext<BaseActionContextType>(
  {} as BaseActionContextType,
);

export type EventBusContextType = {
  itemCreated$: EventEmitter<any>;
};

/** 事件总线，跨组件传递事项创建编辑 */
export const EventBusContext = React.createContext<EventBusContextType>({} as EventBusContextType);
