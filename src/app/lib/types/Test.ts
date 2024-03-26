import { FileType } from 'common/types/test';

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
