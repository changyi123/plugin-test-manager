export const handleBeforeCreate = async () => {
  const APP_KEY = 'test_manager';

  const itemContext = globalThis?.itemContext;

  // 这里直接沿用中关村设置默认名称的环境变量
  const enable = global.env?.CREATE_EXECUTION_DEFAULT_NAME_CONFIG?.enable;

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
