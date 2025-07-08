import { TestFiledKeyMapping, TestLinkType, TestType } from '../common/constant';
import { getAllEntity } from './lib/helper';

interface IPayload {
  field: string;
  operator: string;
  arguments: any[];
}

const log = (...args) => {
  console.info('test_manager_iqlFunction ', ...args);
};

// 根据测试执行任务查询规划的测试用例
export const testExecutionCases = async ({ payload }: { payload: IPayload }) => {
  const { field, operator, arguments: executionIds } = payload;

  log('testExecutionCases-field', JSON.stringify(field));
  log('testExecutionCases-operator', JSON.stringify(operator));
  log('testExecutionCases-arguments', JSON.stringify(executionIds));

  const runs = await getAllEntity(
    {
      query: {
        type: TestType.Run,
        linkType: TestLinkType.RunLinkExecution,
        linkItems: executionIds,
      },
    },
    ['id', TestFiledKeyMapping.runDetail, TestFiledKeyMapping.referenceCase],
  );

  const caseSet = new Set();
  runs?.forEach(run => {
    const caseId = run?.referenceCase;
    if (caseId) {
      caseSet.add(caseId);
    }
  });

  const caseIds = [...caseSet];

  log('query caseIds', JSON.stringify(caseIds));
  return { iql: `id in ${JSON.stringify(caseIds)}` };
};

// 根据测试用例查询引用的测试执行任务
export const testCaseExecutions = async ({ payload }: { payload: IPayload }) => {
  const { field, operator, arguments: caseIds } = payload;

  log('testCaseExecutions-field', JSON.stringify(field));
  log('testCaseExecutions-operator', JSON.stringify(operator));
  log('testCaseExecutions-arguments', JSON.stringify(caseIds));

  const runs = await getAllEntity(
    {
      query: {
        type: TestType.Run,
        referenceCase: caseIds,
      },
    },
    ['id', TestFiledKeyMapping.runDetail, TestFiledKeyMapping.linkItems],
  );

  const executionSet = new Set();
  runs?.forEach(run => {
    const executionId = run?.linkItems?.[0];
    if (executionId) {
      executionSet.add(executionId);
    }
  });

  const executionIds = [...executionSet];

  log('query executionIds', JSON.stringify(executionIds));
  return { iql: `id in ${JSON.stringify(executionIds)}` };
};
