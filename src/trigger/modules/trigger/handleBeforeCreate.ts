import { TestFiledKeyMapping, TestType } from '../../../common/constant';

const validate = () => {
  const APP_KEY = 'test_manager';

  // 这里直接沿用中关村设置默认名称的环境变量
  const enable = global.env?.CREATE_EXECUTION_DEFAULT_NAME_CONFIG?.enable;

  const itemContext = globalThis?.itemContext;

  if (!enable) {
    return;
  }

  if (itemContext && APP_KEY in itemContext) {
    const data = itemContext[APP_KEY];

    // 中关村校验，不用国际化
    if (!data?.repository) {
      throw new Error('所属模块不能为空');
    }

    if (!data?.precondition) {
      throw new Error('前置条件不能为空');
    }

    if (!data?.steps?.length) {
      throw new Error('用例步骤不能为空');
    }

    data.steps?.forEach(step => {
      if (!step.action) {
        throw new Error('用例步骤中步骤不能为空');
      }

      if (!step.result) {
        throw new Error('用例步骤中预期不能为空');
      }
    });
  }
};

export const handleBeforeCreate = async () => {
  validate();

  const item = globalThis?.item;
  const testType = item?.values?.r_test_manager_type;
  if (testType === TestType.Execution) {
    // 测试执行任务 清空 测试缺陷、引用用例数字段
    item.values[TestFiledKeyMapping.testDefects] = [];
    item.values[TestFiledKeyMapping.executionCases] = 0;
  } else if (testType === TestType.Case) {
    // 测试用例 清空 测试缺陷字段

    item.values[TestFiledKeyMapping.testDefects] = [];
  }
  return { item };
};
