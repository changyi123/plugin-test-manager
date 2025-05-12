import { useRequest } from 'ahooks';
import { uniq } from 'lodash';

import { getTestConfig } from '@/lib/api/common';
import { getCustomFields } from '@/lib/api/proxima';
import { getCurrentUserSetting } from '@/lib/api/userSetting';
import { SYSTEM_FIELD, TestType } from '@/lib/constants';
import { CurrentWorkspaceConfigStorageKey, GlobalConfigStorageKey } from '@/lib/constants';
import { useUsedScreenFieldKeys } from '@/lib/hooks/useProxima';
import { useNoExpiredRequest } from '@/lib/hooks/useRequest';

import { TitleCellOption } from './type';

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
  const { data: testConfig } = useNoExpiredRequest(
    async () => {
      const config = await getTestConfig({ workspaceKey });
      return config?.toJSON();
    },
    {
      ready: Boolean(workspaceKey),
      cacheKey: `ItemTypeMapping_${workspaceKey}`,
      staleTime: -1,
    },
  );

  const customerFieldKeys = useScreenFieldKeysFromTestConfig({
    workspaceKey,
    testConfig: testConfig ?? {},
    testType,
  });
  return customerFieldKeys;
};

export const useScreenFieldKeysFromTestConfig = ({ workspaceKey, testConfig, testType }) => {
  const itemTypeMap = testConfig.itemTypeMap;
  const itemTypeKey = itemTypeMap?.[testType];

  const customerFieldKeys = useUsedScreenFieldKeys(workspaceKey, itemTypeKey);
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
      // 先查本地存储
      const localGlobalConfig = localStorage.getItem(GlobalConfigStorageKey);
      if (localGlobalConfig) return JSON.parse(localGlobalConfig);
      // 没有再调接口
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
      // 先查本地存储
      const localConfig = localStorage.getItem(CurrentWorkspaceConfigStorageKey);
      if (localConfig) return JSON.parse(localConfig);
      // 没有再调接口
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
  const _fieldKeys = uniq((filedKeys || []).concat(SystemFieldKeys)).sort();
  const { data: customFields } = useNoExpiredRequest(() => getCustomFields(_fieldKeys), {
    ready: Boolean(filedKeys),
    cacheKey: `CustomFields_${_fieldKeys.toString()}`,
    refreshDeps: [filedKeys],
    cacheTime: 999999,
    staleTime: 999999,
    debounceWait: 300,
  });
  return customFields;
};
