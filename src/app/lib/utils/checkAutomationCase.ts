import { message } from 'antd';

import { getTestEntityByQuery } from '@/lib/api/item';
import { TestType } from '@/lib/constants';

/**
 * 检查测试执行列表中是否包含自动化用例
 * @param testRunIds 测试执行ID列表
 * @param generalSetting 通用配置
 * @param t 国际化函数
 * @returns 如果包含自动化用例且不允许手动执行则返回true,否则返回false
 */
export const checkHasAutomationCase = async (
  testRunIds: string[],
  generalSetting: any,
  t: (key: string) => string,
): Promise<boolean> => {
  // 如果配置允许自动化用例手动执行,则直接返回false(不需要阻止)
  if (generalSetting?.allowAutomationManualExecution !== false) {
    return false;
  }

  console.log('=== [批量更新状态] 检查自动化用例 ===');
  console.log('待更新的testRunIds:', testRunIds);

  // 1. 查询测试执行,获取关联的测试用例ID
  const { list: testRuns } = await getTestEntityByQuery({
    query: {
      id: testRunIds,
      type: TestType.Run,
    },
    select: ['id', 'referenceCase'],
    limit: 9999,
  });

  console.log('查询到的testRuns:', testRuns);

  // 2. 提取所有关联的测试用例ID
  const testCaseIds = testRuns.map(run => run.referenceCase).filter(Boolean);
  console.log('关联的testCaseIds:', testCaseIds);

  if (testCaseIds.length === 0) {
    console.log('没有找到关联的测试用例');
    console.log('=====================================');
    return false;
  }

  // 3. 查询测试用例,获取自动化用例字段
  const { list: testCases } = await getTestEntityByQuery({
    query: {
      id: testCaseIds,
      type: TestType.Case,
    },
    fields: ['r_test_manager_atm_test_id'], // 获取自动化用例字段
    limit: 9999,
  });

  console.log('查询到的testCases:', testCases);

  // 4. 检查是否有自动化用例
  const hasAutomationCase = testCases.some(testCase => {
    const isAutomation = !!testCase?.values?.r_test_manager_atm_test_id;
    console.log(
      `testCase ${testCase.id} 是否为自动化用例:`,
      isAutomation,
      testCase?.values?.r_test_manager_atm_test_id,
    );
    return isAutomation;
  });

  console.log('是否包含自动化用例:', hasAutomationCase);
  console.log('=====================================');

  if (hasAutomationCase) {
    message.error(t('自动化用例不允许手动执行'));
    return true;
  }

  return false;
};
