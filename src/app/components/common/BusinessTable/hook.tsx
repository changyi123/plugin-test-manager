import { useUsedScreenFieldKeys } from '@/lib/hooks/useProxima';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';
import { getTestConfig } from '@/lib/api/common';
import { SYSTEM_FIELD, TestType } from '@/lib/constants';
import { TitleCellOption } from './type';
import { getCurrentUserSetting } from '@/lib/api/userSetting';
import { useRequest } from 'ahooks';
import { getCustomFields } from '@/lib/api/proxima';

// const TestIncludeFiledKeys = ['status'];

export const SystemFieldKeys = [
  // SYSTEM_FIELD.UpdatedBy
  // SYSTEM_FIELD.Sprint,
  // SYSTEM_FIELD.ItemType,
  // SYSTEM_FIELD.UpdatedAt,
  SYSTEM_FIELD.CreatedBy,
  SYSTEM_FIELD.CreatedAt,
  SYSTEM_FIELD.Key,
  SYSTEM_FIELD.Name,
  SYSTEM_FIELD.Status,
  SYSTEM_FIELD.Version,
  SYSTEM_FIELD.Priority,
  SYSTEM_FIELD.Assignee,
  SYSTEM_FIELD.Workspace,
] as const;

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
      staleTime: -1,
    },
  );

  const itemTypeKey = itemTypeMap?.[testType];
  // 除测试计划外其他测试类型需要隐藏状态字段
  // const shouldHiddenFieldKeys = testType !== TestType.Plan ? TestIncludeFiledKeys : [];
  const customerFieldKeys = useUsedScreenFieldKeys(workspaceKey, itemTypeKey);

  // const { data: typeScreenFiledKeys } = useRequest(
  //   // async () => [].concat(SystemFieldKeys, customerFields),
  //   async () => customerFields,
  //   {
  //     cacheKey: `${workspaceKey}_${testType}_${JSON.stringify(customerFields)}`,
  //     refreshDeps: [JSON.stringify(customerFields), workspaceKey, testType],
  //     cacheTime: 99999,
  //     staleTime: 99999,
  //   },
  // );
  return customerFieldKeys;
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
      const globalConfig = await getTestConfig({ global: true });
      return globalConfig?.toJSON();
    },
    {
      refreshDeps: [isSettingPage, isCheckedGlobalConfig],
    },
  );

  const { data: testConfig } = useRequest(
    async () => {
      if (!workspaceKey) return null;
      const testConfig = await getTestConfig({ workspaceKey });
      return testConfig?.toJSON();
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

  const getColumns = data => data?.filter(d => !['action', 'title'].includes(d));

  if (isSettingPage) {
    const { serachFields, tableColumns } = globalConfig?.tableFields?.[testType] ?? {};

    return isCheckedGlobalConfig
      ? {
          filterFields: serachFields ?? defaultKeys,
          tableFields: getColumns(tableColumns),
        }
      : {
          filterFields: fields ?? defaultKeys,
          tableFields: getColumns(columns),
        };
  }

  return {
    filterFields: filterFields ?? fields ?? defaultKeys,
    tableFields: getColumns(columns),
    defaultFields: fields,
  };
};

export const useGetCustomFields = ({ filedKeys }: { filedKeys?: string[] }) => {
  const { data: customFields } = useNoExpiredRequest(
    () => getCustomFields(filedKeys.concat(SystemFieldKeys)),
    {
      ready: Boolean(filedKeys),
      cacheKey: `CustomFields_${filedKeys?.toString()}_${SystemFieldKeys?.toString()}}`,
      refreshDeps: [filedKeys],
      cacheTime: 999999,
      staleTime: 999999,
    },
  );

  return customFields;
};
