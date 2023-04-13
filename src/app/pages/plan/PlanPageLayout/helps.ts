import { TestCaseStatusModel, TestRunDesigneeModel, TestRunExecutorModel } from '@/lib/constants';
import { has, pick } from 'lodash';

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
