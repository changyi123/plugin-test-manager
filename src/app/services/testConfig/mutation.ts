import { useMutation } from '@tanstack/react-query';

import { TestConfig } from '../models';

/** 配置修改 */
export const useTestConfigMutation = () => {
  return useMutation({
    mutationFn: async (data: { objectId: string; [key: string]: any }) => {
      const { objectId, ...testConfigData } = data;
      const testConfigObject = new TestConfig({ objectId });
      testConfigObject.set(testConfigData);
      return testConfigObject.save(data);
    },
  });
};
