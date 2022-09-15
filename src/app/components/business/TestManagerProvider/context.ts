import React from 'react';
import { TestEntity } from '@/lib/types/Test';
import { Item, Workspace } from '@/lib/types/App';
import { TestType } from 'common/constant';

export type TestConfigContextType = {
  config: {
    // 测试类型 和 itemType 类型关联
    itemTypeMap: Record<TestType, 'string'>;
    // 权限关联
    defectsMapping: string[];
    // 空间隔离配置
    isolateTestType: TestType[];
  };
  workspace?: Workspace;
  testEntity?: Parse.Object<TestEntity>;
};
/** 测试管理配置 context */
export const TestConfigContext = React.createContext<TestConfigContextType>(
  {} as TestConfigContextType,
);

export type BaseActionContextType = {
  /** 新建事项，并会生成对应的测试实体 */
  createItemUseModal: <Extra extends Record<string, any>>(params: {
    name?: string;
    hideMessage?: boolean;
    type: TestType;
    extraData?: Extra;
  }) => Promise<{
    extraData: Extra;
    useItemBatchCreate: boolean;
    item?: Item;
    itemList?: Item[];
    testEntity?: Parse.Object<TestEntity>;
    testEntityList?: Parse.Object<TestEntity>[];
  }>;
  /** 打开事项 panel */
  openItemViewPanel: (itemId: string) => void;
  /** 获取全局配置 */
  getGlobalConfig?: () => Record<string, any>;
};
/** proxima 操作 context */
export const BaseActionContext = React.createContext<BaseActionContextType>(
  {} as BaseActionContextType,
);
