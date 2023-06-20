import { useMutation, useQueryClient } from '@tanstack/react-query';

import { TestConfig } from '../models';
import { TestConfigQueryKeys } from './query';

/** 配置修改 */
export const useTestConfigUpdateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { objectId: string; [key: string]: any }) => {
      const { objectId, ...testConfigData } = data;
      const testConfigObject = new TestConfig({ objectId });
      testConfigObject.set(testConfigData);
      return testConfigObject.save(data);
    },
    onSuccess(data) {
      const testConfigData = data.toJSON();
      const originalData = queryClient.getQueryData(
        TestConfigQueryKeys.objectId(testConfigData.objectId),
      );
      const newData = Object.assign({}, originalData, testConfigData);
      if (newData.global) {
        queryClient.setQueryData(TestConfigQueryKeys.global, newData);
      } else {
        queryClient.setQueryData(
          TestConfigQueryKeys.workspace(newData.workspace?.objectId),
          newData,
        );
      }
    },
  });
};
