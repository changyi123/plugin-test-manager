import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TestReport } from '../models';
import { TestReportModelType } from './model';
import { TestReportQueryKeys } from './query';

/** 配置修改 */
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
