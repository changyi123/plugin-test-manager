import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TestReport } from '../models';
import { TestReportModelType } from './model';
import { TestReportQueryKeys } from './query';

/** 测试报告创建 */
export const useTestReportCreateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<TestReportModelType>) => {
      const testReportObject = new TestReport();
      await testReportObject.createTemplate(data);
      return testReportObject.toJSON();
    },
    onSuccess: testReportData => {
      queryClient.setQueryData(
        TestReportQueryKeys.objectId(testReportData.objectId),
        testReportData,
      );
    },
  });
};

/** 测试报告修改 */
export const useTestReportUpdateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      data: Pick<TestReportModelType, 'objectId'> & Partial<TestReportModelType>,
    ) => {
      const testReportObject = new TestReport();
      testReportObject.set(data);
      await testReportObject.save();
      return testReportObject.toJSON();
    },
    onSuccess: testReportData => {
      const newTestReportData = Object.assign(
        {},
        queryClient.getQueryData(TestReportQueryKeys.objectId(testReportData.objectId)),
        testReportData,
      );
      queryClient.setQueryData(
        TestReportQueryKeys.objectId(testReportData.objectId),
        newTestReportData,
      );
    },
  });
};
