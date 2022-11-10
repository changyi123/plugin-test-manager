import { useUsedScreenFieldKeys } from '@/lib/hooks/useProxima';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { getTestConfig } from '@/lib/api/common';
import { TestType } from '@/lib/constants';
import { TitleCellOption } from './type';
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
  isCheckedGlobalConfig,
}: {
  workspaceKey?: string;
  testType?: string;
  isSettingPage?: boolean;
  isCheckedGlobalConfig?: boolean;
}) => {
  const defaultKeys = testType === TestType.Case ? ['key'] : [];
  const { data: globalConfig } = useRequest(
    async () => {
      if (!isSettingPage && !isCheckedGlobalConfig) return null;
      const globalConfig = await await getTestConfig({ global: true });
      return globalConfig.toJSON();
    },
    {
      refreshDeps: [isSettingPage, isCheckedGlobalConfig],
    },
  );

  const { data: testConfig } = useRequest(
    async () => {
      if (!workspaceKey) return null;
      const testConfig = await getTestConfig({ workspaceKey });
      return testConfig.toJSON();
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [workspaceKey],
    },
  );

  const { data: filterFields } = useRequest(
    async () => {
      if (isSettingPage) return null;
      const res = await getCurrentUserSetting({
        workspaceKey,
      });

      return res?.filterFields?.[testType];
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [workspaceKey, isSettingPage],
    },
  );
  const { serachFields: fields, tableColumns: columns } = testConfig?.tableFields?.[testType] ?? {};

  if (isSettingPage) {
    const { serachFields, tableColumns } = globalConfig?.tableFields?.[testType] ?? {};

    return isCheckedGlobalConfig
      ? { filterFields: serachFields ?? defaultKeys, tableFields: tableColumns }
      : { filterFields: fields ?? defaultKeys, tableFields: columns };
  }

  return {
    filterFields: filterFields ?? fields ?? defaultKeys,
    tableFields: columns,
    defaultFields: fields,
  };
};

export const useGetcustomFields = ({
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

  return customFields;
};
