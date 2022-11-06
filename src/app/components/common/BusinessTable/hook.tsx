import { useUsedScreenFieldKeys } from '@/lib/hooks/useProxima';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { getTestConfig } from '@/lib/api/common';
import { TestType } from '@/lib/constants';
import { TitleCellOption } from './type';
import { useWorkspaceTestConfig } from '@/lib/hooks/useTest';
import { getCurrentUserSetting } from '@/lib/api/userSetting';
import { useRequest } from 'ahooks';
import { getCustomFields } from '@/lib/api/proxima';

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
  const { serachFields, tableColumns } = testConfig?.tableFields?.[testType] ?? {};

  const { data: filterFields } = useRequest(async () => {
    const res = await getCurrentUserSetting({
      workspaceKey,
    });

    return res?.filterFields?.[testType] ?? [];
  });

  return {
    filterFields:
      (isSettingPage ? serachFields : filterFields?.length ? filterFields : serachFields) ?? [],
    tableFields: tableColumns ?? [],
  };
};

export const useGetFilterField = ({
  workspaceKey,
  testType,
}: {
  workspaceKey?: string;
  testType?: TestType;
}) => {
  const keys = useTestTypeScreenFieldKeys({
    workspaceKey,
    testType,
  });

  const { data: customFields } = useNoExpiredRequest(() => getCustomFields(keys), {
    cacheKey: `CustomFields_${keys.toString()}`,
    refreshDeps: [keys],
  });
  const { data: filterFields } = useRequest(async () => {
    const res = await getCurrentUserSetting({
      workspaceKey,
    });

    return res?.filterFields?.[testType];
  });

  return customFields?.filter(filed => filterFields?.includes(filed.key));
};
