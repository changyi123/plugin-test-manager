import { useUsedScreenFieldKeys } from '@/lib/hooks/useProxima';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { getTestConfig } from '@/lib/api/common';
import { TestType } from '@/lib/constants';
import { TitleCellOption } from './type';
import { useCurrentUser } from '@/lib/api/user';
import { useWorkspaceTestConfig } from '@/lib/hooks/useTest';
import { useRequest } from 'ahooks';
import { getCurrentUserSetting } from '@/lib/api/userSetting';

const TestIncludeFiledKeys = ['status'];

export const useTestTypeScreenFieldKeys = ({
  workspaceKey,
  testType,
}: TitleCellOption['titleCellOption']) => {
  const { data: itemTypeMap } = useNoExpiredRequest(
    async () => {
      const config = await getTestConfig({ workspaceKey });
      const { itemTypeMap } = config?.toJSON() ?? ({} as any);
      return itemTypeMap;
    },
    {
      ready: Boolean(workspaceKey),
      cacheKey: `ItemTypeMapping_${workspaceKey}`,
    },
  );
  const itemTypeKey = itemTypeMap?.[testType];
  // 除测试计划外其他测试类型需要隐藏状态字段
  const shouldHiddenFieldKeys = testType !== TestType.Plan ? TestIncludeFiledKeys : [];
  return useUsedScreenFieldKeys(workspaceKey, itemTypeKey, shouldHiddenFieldKeys);
};

export const useGetTableFilterFields = ({
  workspaceKey,
  testType,
  isSettingPage,
}: {
  workspaceKey?: string;
  testType?: string;
  isSettingPage?: boolean;
}) => {
  const testConfig = useWorkspaceTestConfig(workspaceKey);

  testConfig?.tableFields?.[testType];
  const { data: user } = useCurrentUser() ?? {};

  const { data: filterFields } = useRequest(async () => {
    const res = await getCurrentUserSetting({
      workspaceKey,
      user,
    });

    return res?.filterFields?.[testType];
  });

  return {
    filterFields:
      (isSettingPage ? testConfig?.tableFields?.[testType]?.serachFields : filterFields) ?? [],
    tableFields: testConfig?.tableFields?.[testType]?.tableColumns ?? [],
  };
};
