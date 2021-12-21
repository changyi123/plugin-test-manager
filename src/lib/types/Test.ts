import { Item } from './App';
import { TestType } from '@/lib/constants';

export type TestStep = {
  action: string;
  data: string;
  expectedResult: string;
  attachments: string[];
  index: number;
  callTestIssueId: string;
};

/** 测试实体对应和事项一对一关联 */
export type TestEntity = {
  type: TestType;
  workspaceKey: string;
  /** 测试详情使用 */
  reference: Item;
  steps: TestStep[];
  extra: Record<string, unknown>;
};

export type TestExecution = {
  actualResult: string;
  comment: string;
  defects: [];
  evidence: [];
  activity: string;
};
