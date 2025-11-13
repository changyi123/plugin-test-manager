import { FileType } from 'common/types/test';

import { CASESNAPSHOT_TYPE } from '@/lib/constants';

export * from 'common/types/test';

export type UserPointerInfo = {
  __type: 'Pointer';
  className: '_User';
  objectId: string;
};

/** word 测试报告模板 */
export type WordTemplate = {
  name: string;
  // 该模板是否可用
  enable: boolean;
  // 文件地址
  file: FileType;

  // TODO: 数据集
  dataSet: any[];
  // TODO: 空间
  workspace: any[];
  // TODO: 前置执行脚本
  preExecuteScript: string;
};

export type CopyTestCasePayload = {
  caseIds: string[];
  fields: string[];
  repository?: string;
  workspaceKey?: string;
};

export type CopyTestCaseV2Payload = {
  queryParams: Record<string, any>;
  fields: string[];
  to?: CopyTestCaseV2PayloadTo;
};

export type CopyTestCaseV2PayloadTo = {
  repository: string;
  workspace: { objectId: string; key: string };
};

export type GeneralSetting = {
  caseDetailExtra: boolean;
  // 允许自动化用例手动执行开关，默认 true 表示允许
  allowAutomationManualExecution?: boolean;
};

export type CaseSnapshotType =
  | CASESNAPSHOT_TYPE.NO_AUTOBUILDVERSION_NO_SELVERSION
  | CASESNAPSHOT_TYPE.AUTO_BUILDVERSION
  | CASESNAPSHOT_TYPE.NO_BUILDVERSION_SELVERSION;

export interface CaseSnapshot {
  type: CaseSnapshotType;
  enableCaseExeUpdate: boolean;
  restrictiveConditions?: string;
}
