import { BaseTestEntity } from 'common/types/test';
import React from 'react';

import { TestType } from '@/lib/constants';
import { Item, Workspace } from '@/lib/types/App';
import { CaseSnapshot, GeneralSetting } from '@/lib/types/Test';

export interface StatusType {
  key: string;
  name: string;
  type: string;
  color: string;
  final: boolean;
  native: boolean;
  readOnly: boolean;
}

export type TestConfigContextType = {
  config: {
    // 测试类型 和 itemType 类型关联
    itemTypeMap: Record<TestType, 'string'>;
    // 权限关联
    defectsMapping: string[];
    // 空间隔离配置
    isolateTestType: TestType[];
    // 状态
    statuses: StatusType[];
    // 限制状态列表类型
    listType?: string;
    // 限制状态列表
    statusList?: { statusId: string; name: string; isStartStatus?: boolean }[];
    // 默认测试用例规划范围
    iql?: string;
    //用例快照类型
    caseSnapshot?: CaseSnapshot
  };
  workspace?: Workspace;
  testEntity?: BaseTestEntity;
  setTestEntity: (data: BaseTestEntity) => void;
  baseLineItemId?: string;
  generalSetting?: GeneralSetting;
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
    defaultValues?: Record<string, any>;
  }) => Promise<{
    extraData: Extra;
    useItemBatchCreate: boolean;
    item?: Item;
    itemList?: Item[];
    testEntity?: BaseTestEntity;
    testEntityList?: BaseTestEntity[];
  }>;
  /** 打开事项 panel */
  openItemViewPanel: (itemId: string) => void;
  /** 获取全局配置 */
  getGlobalConfig?: () => Record<string, any>;
  getTestCaseRepositoryPath?: (val?: string) => string;
  getCreatePermission?: (val: string) => boolean;
  testPlanFieldKeys?: string[];
  testCaseFieldKeys?: string[];
  testCaseSetFieldKeys?: string[];
  testExecutionFieldKeys?: string[];
  testReportFieldKeys?: string[];
  globalTestConfig: any;
};
/** proxima 操作 context */
export const BaseActionContext = React.createContext<BaseActionContextType>(
  {} as BaseActionContextType,
);
