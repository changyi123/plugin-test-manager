import fetch from 'proxima-sdk/lib/Fetch';
import { mergeIQL, withWorkspace } from 'proxima-sdk/lib/Iql';

export enum TEST_MANAGER_TYPE {
  TEST_PLAN = 'TestPlan',
  TEST_EXECUTION = 'TestExecution',
}

export enum TEST_MANAGER_SELECTOR {
  TEST_PLAN = 'testPlan',
  TEST_EXECUTION = 'testExecution',
}

export interface TEST_MANAGER_PARAMS {
  iql?: string;
  size?: number;
  type: TEST_MANAGER_TYPE;
}

export const getEnvData = (): EnvData => {
  const QianKunProps = window.QiankunProps;
  if (QianKunProps) {
    return {
      PROXIMA_APP_ID: QianKunProps?.context?.env?.PROXIMA_APP_ID,
      PROXIMA_GATEWAY: QianKunProps?.context?.env?.PROXIMA_GATEWAY,
      PROXIMA_BASE_PATH: (window as any).env.PROXIMA_BASE_PATH,
      GITEE_ONE_GATEWAY: (window as any).env.GITEE_ONE_GATEWAY,
      TENANT_KEY: QianKunProps?.context?.env?.TENANT_KEY,
      APP_KEY: QianKunProps?.frame?.app?.key,
    };
  } else {
    const env = window.proxy?.env ?? window?.env;
    return {
      PROXIMA_APP_ID: env?.PROXIMA_APP_ID,
      PROXIMA_GATEWAY: env?.PROXIMA_GATEWAY,
      PROXIMA_BASE_PATH: env?.PROXIMA_BASE_PATH,
      GITEE_ONE_GATEWAY: env?.GITEE_ONE_GATEWAY,
      TENANT_KEY: env?.TENANT_KEY,
      APP_KEY: env?.APP_KEY,
    };
  }
};

export const getTestManagerItems = async (params: TEST_MANAGER_PARAMS): Promise<any> => {
  const { PROXIMA_GATEWAY } = getEnvData();

  const { iql = '', type = TEST_MANAGER_TYPE.TEST_PLAN, size = 100 } = params;

  const testManagerIQL = `test_manager_type = "${type}"`;

  const fullIql = mergeIQL(testManagerIQL, iql);

  const result = await fetch.post(`${PROXIMA_GATEWAY}/parse/api/search`, {
    iql: fullIql,
    size,
    from: 0,
    fields: ['name', 'workspace', 'id'],
    displayContext: 'test_manager',
  });

  const items = result?.data?.payload?.items;
  if (!items?.length) {
    return [];
  }

  return items.map(item => ({
    label: item.name,
    value: item.objectId,
    workspace: item.workspace,
  }));
  ``;
};

export const getTestEntityByName = async ({
  name,
  type,
  onlyWorkspace,
  workspace,
  linkItems = [],
}) => {
  let iql = '';
  if (name) {
    iql = `标题 ~ '${name}'`;
  }

  if (linkItems?.length) {
    iql = mergeIQL(iql, `test_manager_linkItems in ${JSON.stringify(linkItems)}`);
  }

  if (onlyWorkspace) {
    iql = withWorkspace(iql, workspace);
  }
  return getTestManagerItems({
    iql,
    type: type,
  });
};

export const getTestEntityByIds = async ({ ids, type }) => {
  if (!ids.length) return [];
  return getTestManagerItems({ iql: `id in ${JSON.stringify(ids)}`, type });
};

export const formatterIql = (planIds, executionIds) => {
  let iql = '';
  if (planIds?.length) {
    iql = mergeIQL(iql, `test_manager_linkItems in ${JSON.stringify(planIds)} `);
  }
  if (executionIds?.length) {
    iql = mergeIQL(iql, `test_manager_linkItems in ${JSON.stringify(executionIds)}`);
  }

  return iql;
};
