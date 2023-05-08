import { has, pick } from 'lodash';

import { TestCaseStatusModel, TestRunDesigneeModel, TestRunExecutorModel } from '@/lib/constants';

export const getTestRunSelector = customSelector => {
  if (
    has(customSelector, [TestRunDesigneeModel]) ||
    has(customSelector, [TestRunExecutorModel]) ||
    has(customSelector, [TestCaseStatusModel])
  ) {
    return pick(customSelector, [TestRunDesigneeModel, TestRunExecutorModel, TestCaseStatusModel]);
  }
  return;
};
