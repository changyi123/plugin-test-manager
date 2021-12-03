// 测试类型 enum
export enum ETestType {
  Test = 'Test',
  TestSet = 'TestSet',
  TestPlan = 'TestPlan',
  Precondition = 'Precondition',
  TestExecution = 'TestExecution',
}

export type TestStep = {
  action: string;
  data: string;
  expectedResult: string;
  attachments: string[];
  index: number;
  callTestIssueId: string;
};

export type TestExecution = {
  actualResult: string;
  comment: string;
  defects: [];
  evidence: [];
  activity: string;
} & TestStep;
