import { message } from 'antd';
import {
  BatchCopyTestCaseV2ProcessParams,
  BatchCopyTestCaseV3ProcessParams,
  BatchCreateTestRunV2ProcessParams,
  QueryLinkedTestEntityPayload,
  QueryTestEntityPayload,
  RepositoryTreePayload,
  TestCaseStatsPayload,
  TestCountPayload,
  TestExecutionStatsPayload,
  TestPlanStatsPayload,
  TestSetStatsPayload,
} from 'common/types/api';
import { has, omit, pick, uniq } from 'lodash';
import { merge } from 'lodash';

import fetch from '@/lib/utils/fetch';

import { getAppEnv } from '../appEnv';
import {
  RepositoryModel,
  SYSTEM_FIELD,
  TestCaseStatusModel,
  TestFiledKeyMapping,
  TestRunDesigneeModel,
  TestRunExecutorModel,
  TestSetModel,
  TestType,
} from '../constants';
import { BaseTestEntity, CopyTestCasePayload, Status, TestEntity } from '../types/Test';
import { getPluginWebTriggerBaseUrl, getSessionToken } from '../utils/helper';
import { SearchSelectors, selectorToIql } from '../utils/iql';
import { compactStepModel } from '../utils/modelTransfer';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

interface QueryCaseIdByStatusPayload {
  planId: string;
  status: Status['key'] | string[] | null;
  isExclude?: boolean;
}

// 处理筛选器数据
export const handleSelector = selector => {
  if (!selector) return null;
  const [systemSelector, customSelector, defaultIql] = selector;
  const _customSelector = omit(customSelector, RepositoryModel);
  const _systemSelector = omit(systemSelector, SYSTEM_FIELD.Status);
  const selectors = {} as Record<string, any>;

  if (has(systemSelector, SYSTEM_FIELD.Status)) {
    // 处理事项状态筛选字段
    const data = pick(systemSelector, SYSTEM_FIELD.Status)?.[SYSTEM_FIELD.Status];
    selectors[SYSTEM_FIELD.Status] = data
      ? {
          ...data,
          value: data?.value?.map(d => d.value),
        }
      : {};
  }

  if (has(customSelector, RepositoryModel)) {
    // 处理测试用例库筛选字段
    const data = pick(customSelector, RepositoryModel)?.[RepositoryModel];
    selectors[RepositoryModel] = data
      ? {
          ...data,
          component: 'Dropdown',
          fieldName: 'test_manager_repository',
        }
      : {};
  }

  if (has(customSelector, TestSetModel)) {
    // 处理测试用例库筛选字段
    const data = pick(customSelector, TestSetModel)?.[TestSetModel];
    selectors[TestSetModel] = data
      ? {
          ...data,
          component: 'Dropdown',
          fieldName: TestSetModel,
        }
      : {};
  }

  if (has(customSelector, TestRunDesigneeModel)) {
    // 处理测试用例库筛选字段
    const data = pick(customSelector, TestRunDesigneeModel)?.[TestRunDesigneeModel];
    selectors[TestRunDesigneeModel] = data
      ? {
          ...data,
          fieldName: TestRunDesigneeModel,
        }
      : {};
  }

  if (has(customSelector, TestRunExecutorModel)) {
    // 处理测试用例库筛选字段
    const data = pick(customSelector, TestRunExecutorModel)?.[TestRunExecutorModel];
    selectors[TestRunExecutorModel] = data
      ? {
          ...data,
          fieldName: TestRunExecutorModel,
        }
      : {};
  }

  if (has(customSelector, TestCaseStatusModel)) {
    // 处理测试用例库筛选字段
    const data = pick(customSelector, TestCaseStatusModel)?.[TestCaseStatusModel];
    selectors[TestCaseStatusModel] = data
      ? {
          ...data,
          fieldName: TestCaseStatusModel,
        }
      : {};
  }

  return {
    ..._systemSelector,
    ..._customSelector,
    ...selectors,
    defaultIql,
  };
};

// 查询测试用例事项
export const getTestEntityByQuery = async (
  props:
    | QueryTestEntityPayload
    | {
        selector?: SearchSelectors | string;
      },
  handleQuery?: (val: any) => any,
) => {
  props = handleQuery ? handleQuery(props) : props;
  const _props = Object.assign(
    { descending: [], onlySelectId: false },
    {
      ...props,
      selector:
        typeof props.selector === 'string'
          ? props.selector
          : selectorToIql(handleSelector(props.selector)),
    },
  );

  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-query-test-entity`, {
    ..._props,
    sessionToken: getSessionToken(),
  });

  return {
    list: data.list ?? [],
    total: data.total ?? [],
  };
};

export const exportTestExecution = async params => {
  const res = await fetch.post(
    '/parse/api/export/excel',
    {
      ...params,
    },
    { responseType: 'blob' },
  );
  return res;
};

// 关联查询
export const getLinkedTestEntityByQuery = async (
  props:
    | QueryLinkedTestEntityPayload
    | {
        selector?: SearchSelectors;
      },
  handleQuery?: (val: any) => any,
) => {
  props = handleQuery ? handleQuery(props) : props;
  const _props = Object.assign(
    { descending: [], onlySelectId: false },
    { ...props, selector: selectorToIql(handleSelector(props.selector)) },
  );

  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-query-linked-test-entity`, {
    ..._props,
    sessionToken: getSessionToken(),
  });

  return {
    list: data.list ?? [],
    total: data.total ?? 0,
  };
};

// 测试管理通用字段统计查询
export const getTestStats = async (props: TestCountPayload) => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-count-test`, {
    ...props,
    sessionToken: getSessionToken(),
  });

  return res.data;
};

// 测试计划统计查询
export const getStatsTestPlan = async (props: TestPlanStatsPayload) => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-plan`, {
    ...props,
    sessionToken: getSessionToken(),
  });

  return res.data;
};

// 测试计划统计查询
export const getStatsTestSet = async (props: TestSetStatsPayload) => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-set`, {
    ...props,
    sessionToken: getSessionToken(),
  });

  return res.data;
};

// 测试计划下用例状态查询接口
export const getCasesByStatus = async (props: QueryCaseIdByStatusPayload) => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-query-case-by-status`, {
    ...props,
    sessionToken: getSessionToken(),
  });

  return res;
};

// 测试执行任务统计查询
export const getStatsTestExecution = async (props: TestExecutionStatsPayload) => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-execution`, {
    ...props,
    sessionToken: getSessionToken(),
  });

  return res.data;
};

// 测试用例统计查询
export const getTestCaseStats = async (props: TestCaseStatsPayload) => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-case`, {
    ...props,
    sessionToken: getSessionToken(),
  });

  return res.data;
};

// 批量删除测试实体事项
export const deleteTestEntity = async props => {
  const params = Array.isArray(props) ? { ids: props } : props;
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-delete`, {
    ...params,
    sessionToken: getSessionToken(),
  });

  if (res.status === 'error') {
    return res;
  }
  return res;
};
// 批量删除测试实体事项 v2
export const deleteTestEntityV2 = async params => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-delete-v2`, {
    ...params,
    sessionToken: getSessionToken(),
  });

  if (res.status === 'error') {
    return res;
  }
  return res;
};

// 批量删编辑事项 v2
export const updateItemsV2 = async params => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-update-items-v2`, {
    ...params,
    sessionToken: getSessionToken(),
  });

  if (res.status === 'error') {
    return res;
  }
  return res;
};

// 批量更新测试实体事项
export const updateTestEntity = async (data, onlyValues?: boolean, isChangeStatus?: boolean) => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-update`, {
    data,
    onlyValues,
    isChangeStatus,
    sessionToken: getSessionToken(),
  });

  if (res.status === 'error') {
    return res;
  }
  return res?.data;
};

// 批量更新测试实体事项 统一值
export const updateTestEntityValue = async params => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-update-value`, {
    ...params,
    sessionToken: getSessionToken(),
  });

  if (res.status === 'error') {
    return res;
  }
  return res?.data;
};

// 复制测试用例
export const copyTestCase = async (data: CopyTestCasePayload) => {
  try {
    const { data: copyItemData } = await fetch.post(
      `${pluginWebTriggerBaseUrl}/api-batch-copy-test-case`,
      {
        ...data,
        sessionToken: getSessionToken(),
      },
    );

    return copyItemData;
  } catch (error) {
    return error;
  }
};

// 复制测试用例 V2
export const copyTestCaseV2 = async (data: BatchCopyTestCaseV2ProcessParams) => {
  try {
    const { data: copyItemData } = await fetch.post(
      `${pluginWebTriggerBaseUrl}/api-batch-copy-test-case-v2`,
      {
        ...data,
        sessionToken: getSessionToken(),
      },
    );

    return copyItemData;
  } catch (error) {
    return error;
  }
};

// 复制测试用例
export const copyTestCaseV3 = async (data: BatchCopyTestCaseV3ProcessParams) => {
  try {
    const { data: copyItemData } = await fetch.post(
      `${pluginWebTriggerBaseUrl}/api-batch-copy-test-case-v3`,
      {
        ...data,
        sessionToken: getSessionToken(),
      },
    );

    return copyItemData;
  } catch (error) {
    return error;
  }
};

// 复制测试用例
export const copyTesCase = async (data: CopyTestCasePayload) => {
  try {
    const { data: copyItemData } = await fetch.post('/parse/api/items/clone', {
      ...data,
    });

    return copyItemData;
  } catch (error) {
    return error;
  }
};

// 批量创建测试执行 notice  这个没地方有暂时不处理
export const batchCreateTestRun = async data => {
  const res = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-create-test-run`, {
    ...data,
    withProcess: false,
    sessionToken: getSessionToken(),
  });

  return res;
};

// 批量创建测试执行
export const batchCreateTestRunV2 = async (data: BatchCreateTestRunV2ProcessParams) => {
  const res = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-create-test-run-v2`, {
    ...data,
    withProcess: false,
    sessionToken: getSessionToken(),
  });

  return res.data;
};

export const getUpdateParams = async data => {
  const { runIds, status } = data;

  const userInfo = await Parse.User.current();
  const getCurrentUserInfo = () => {
    const user = userInfo.toJSON();
    return {
      deleted: user.deleted,
      value: user.objectId,
      nickname: user.nickname,
      username: user.username,
      label: user.username,
    };
  };

  const checkStep = getAppEnv('CHECK_STEP_FOR_CHANGE_RUN_STATUS');
  const isRun = checkStep || ['PASSED', 'FAILED']?.includes(status);

  const updateRuns = {
    items: runIds,
    fields: {
      values: {
        [TestFiledKeyMapping.status]: status,
        [TestFiledKeyMapping.executor]: [getCurrentUserInfo()],
      },
    },
    update: {
      [TestFiledKeyMapping.executeCount]: {
        increment: isRun ? 1 : 0,
      },
    },
  };
  if (isRun) {
    updateRuns.fields.values[TestFiledKeyMapping.executeTime] = new Date().getTime();
  }

  return updateRuns;
};

// 批量更新测试执行状态
export const updateTestStatus = async data => {
  const { runIds, status } = data;
  const userInfo = await Parse.User.current();
  const getCurrentUserInfo = () => {
    const user = userInfo.toJSON();
    return {
      deleted: user.deleted,
      value: user.objectId,
      nickname: user.nickname,
      username: user.username,
      label: user.username,
    };
  };

  // 查询测试执行数据
  const { list: testRuns } = await getTestEntityByQuery({
    query: {
      id: runIds,
      type: TestType.Run,
    },
    limit: 9999,
    select: ['id', 'referenceCase', 'executor', 'status', 'executeCount', 'executeTime'],
  });

  const checkStep = getAppEnv('CHECK_STEP_FOR_CHANGE_RUN_STATUS');

  const updateTestRuns = testRuns.map(d => {
    const isRun = checkStep || ['PASSED', 'FAILED']?.includes(status);
    const result = {
      objectId: d.id,
      status,
      executor: [getCurrentUserInfo(), ...(d.executor ?? [])].slice(0, 3),
      executeCount: (d.executeCount ?? 0) + (isRun ? 1 : 0),
    };
    if (isRun) {
      Object.assign(result, { executeTime: new Date().getTime() });
    }

    return result;
  });

  // 更新测试执行
  const res = await updateTestEntity(updateTestRuns);

  if (res?.status === 'error') {
    message.error(res.data);
    return null;
  }

  return res;
};

// 更新测试执行
export const updateTestRunDetail = async (
  testEntity: TestEntity<TestType.Run>,
  params: {
    status?: Status['key'];
    planId?: string;
    steps?: Record<string, any>[];
    runDetail?: Partial<BaseTestEntity['runDetail']>;
    comments?: Record<string, any>[];
  },
  opts?: { initialization?: boolean },
) => {
  const userInfo = await Parse.User.current();
  /** 设置最新操作执行人 */
  const setExecutor = async needUpdateAttrs => {
    const getCurrentUserInfo = () => {
      const user = userInfo.toJSON();
      return {
        deleted: user.deleted,
        value: user.objectId,
        nickname: user.nickname,
        username: user.username,
        label: user.username,
      };
    };
    // 最新操作执行人存最近三条数据，多存无意
    needUpdateAttrs.executor = [getCurrentUserInfo()];
  };
  opts = merge({ initialization: false }, opts);
  const executeCount = testEntity?.executeCount ?? 0;

  const needUpdateAttrs = {} as TestEntity<TestType.Run>;

  // 中关村需求，改变测试执行状态时校验执行的步骤状态，不需要改动步骤时联动更新执行状态，每次修改状态都算为执行一次
  const checkStep = getAppEnv('CHECK_STEP_FOR_CHANGE_RUN_STATUS');

  // 执行状态为通过或者失败，且前后状态不一致 +1
  if (
    (checkStep || ['PASSED', 'FAILED']?.includes(params.status)) &&
    params.status &&
    testEntity.status !== params.status
  ) {
    needUpdateAttrs.executeCount = executeCount + 1;
    needUpdateAttrs.executeTime = new Date().getTime();
  }

  if (Array.isArray(params.steps)) {
    const steps = params.steps.map(compactStepModel);
    Object.assign(needUpdateAttrs, {
      runDetail: {
        ...testEntity.runDetail,
        steps,
      },
    });

    // 初始化 step 不更新测试执行状态
    if (!opts.initialization && !checkStep) {
      // 有一个失败
      const hasFail = steps.some(item => item.status === 'FAILED');
      // 有一个正在执行
      const hasExecuting = steps.some(item => item.status === 'EXECUTING');
      // 有一个阻塞
      const hasBlock = steps.some(item => item.status === 'BLOCK');
      // 有一个取消
      const hasCannel = steps.some(item => item.status === 'CANCEL');
      // 全部 pass
      const hasAllPass = steps.every(item => item.status === 'PASSED');
      // 全部 todo
      const hasAllTodo = steps.every(item => item.status === 'TODO');

      if (hasFail && !hasBlock && !hasCannel) {
        // 失败且没有阻塞、没有取消 - 失败
        if (testEntity.status !== 'FAILED') {
          needUpdateAttrs.status = 'FAILED';
          needUpdateAttrs.executeCount = executeCount + 1;
          needUpdateAttrs.executeTime = new Date().getTime();
        }
      } else if (hasExecuting && !hasBlock && !hasCannel && !hasFail) {
        // 正在执行且没有取消、阻塞、失败 - 正在执行
        if (testEntity.status !== 'EXECUTING') {
          needUpdateAttrs.status = 'EXECUTING';
        }
      } else if (hasBlock && !hasCannel) {
        // 阻塞且没有取消 - 阻塞
        if (testEntity.status !== 'BLOCK') {
          needUpdateAttrs.status = 'BLOCK';
        }
      } else if (hasAllPass) {
        // 全部通过 - 通过
        if (testEntity.status !== 'PASSED') {
          needUpdateAttrs.status = 'PASSED';
          needUpdateAttrs.executeCount = executeCount + 1;
          needUpdateAttrs.executeTime = new Date().getTime();
        }
      } else if (hasCannel) {
        // 一个取消 - 取消
        if (testEntity.status !== 'CANCEL') {
          needUpdateAttrs.status = 'CANCEL';
        }
      } else if (hasAllTodo) {
        if (testEntity.status !== 'TODO') {
          needUpdateAttrs.status = 'TODO';
        }
      }
      setExecutor(needUpdateAttrs);
    }
  }

  if (params.status) {
    Object.assign(needUpdateAttrs, {
      status: params.status,
    });
    setExecutor(needUpdateAttrs);
  }

  if (params.runDetail) {
    Object.assign(needUpdateAttrs, {
      runDetail: Object.assign(
        {},
        testEntity.runDetail,
        needUpdateAttrs.runDetail ?? {},
        params.runDetail,
      ),
    });
  }

  if (params.comments) {
    Object.assign(needUpdateAttrs, {
      comments: params.comments,
    });
  }

  const res = await updateTestEntity([
    {
      objectId: testEntity.objectId,
      ...needUpdateAttrs,
    },
  ]);
  return res;
};

// 新增缺陷关联
export const addTestDefect = async (
  itemLinkType: string,
  testRunEntity: TestEntity<TestType.Run>,
  defectItemIds: string[],
  stepId?: string,
) => {
  await batchLinkBugs({
    itemLinkType,
    caseId: testRunEntity.referenceCase,
    executionId: testRunEntity.linkItems[0],
    defectItemIds,
    stepId,
  });
};

// 删除缺陷关联
export const deleteTestDefect = async (
  itemLinkType: string,
  run: TestEntity<TestType.Run>,
  defectItemIds: string[],
  stepId?: string,
) => {
  return await batchRemoveBugs({
    itemLinkType,
    caseId: run.referenceCase,
    executionId: run.linkItems[0],
    defectItemIds,
    stepId,
  });
};

// 测试计划数据统计接口
export const getStatsFormPlan = async (data: TestPlanStatsPayload) => {
  const {
    data: { data: res },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-plan`, {
    ...data,
    sessionToken: getSessionToken(),
  });

  return res;
};

// 通过测试用例去查任务数
export const getRunsFromCase = async (data: TestCaseStatsPayload) => {
  const {
    data: { data: res },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-case`, {
    ...data,
    sessionToken: getSessionToken(),
  });
  return res;
};

// 获取测试用例库树
export const getRepositoryTree = async (params: RepositoryTreePayload) => {
  const { data } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-module-repository-tree`, {
    ...params,
    sessionToken: getSessionToken(),
  });
  return data;
};

// 获取测试用例库树V2
export const getRepositoryTreeV2 = async (params: RepositoryTreePayload) => {
  const { params: originParams = { selector: '' } } = params;
  const { data } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-module-repository-tree-v2`, {
    ...params,
    params: {
      ...originParams,
      selector:
        typeof originParams.selector === 'string'
          ? originParams.selector
          : selectorToIql(handleSelector(originParams.selector)),
    },
    sessionToken: getSessionToken(),
  });
  if ((data.status as unknown as string) === 'error') {
    message.error(data.data);
    return {
      data: {
        key: 'root',
        name: '全部用例',
        parentKey: null,
      },
    };
  }
  return data;
};

// 执行关联缺陷
export const batchLinkBugs = async (data: {
  itemLinkType: string;
  caseId: string;
  executionId: string;
  defectItemIds: string[];
  stepId?: string;
}) => {
  try {
    const res = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-link-bug`, {
      ...data,
      sessionToken: getSessionToken(),
    });

    return res;
  } catch (error) {
    return error;
  }
};

// 执行移除缺陷
export const batchRemoveBugs = async (data: {
  itemLinkType: string;
  caseId: string;
  executionId: string;
  defectItemIds: string[];
  stepId?: string;
}) => {
  try {
    const res = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-remove-bug`, {
      ...data,
      sessionToken: getSessionToken(),
    });

    return res;
  } catch (error) {
    return error;
  }
};

// 获取测试用例的测试执行
export const getCaseAllRuns = async params => {
  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-query-case-run-record`, {
    ...params,
    sessionToken: getSessionToken(),
  });
  return data;
};

export const getRelativeItem = async planIds => {
  const res = await new Parse.Query('ItemLink')
    .containedIn('destination', planIds)
    .limit(9999)
    .find({
      json: true,
      context: {
        displayModule: 'plugin.testManager',
      },
    } as any);
  return uniq(res.map(i => (i as any).source?.objectId));
};

export const getRelativeAllItem = async ids => {
  const res = await Parse.Query.or(
    new Parse.Query('ItemLink').containedIn('destination', ids),
    new Parse.Query('ItemLink').containedIn('source', ids),
  )
    .limit(9999)
    .find({
      json: true,
      context: {
        displayModule: 'plugin.testManager',
      },
    } as any);
  return uniq(
    res.flatMap(i => [(i as any).source?.objectId, (i as any).destination?.objectId]),
  ).filter(id => !ids.includes(id));
};

// 获取测试用例的测试执行
export const runScript = async (params, script) => {
  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/run-script`, {
    params: {
      ...params,
      sessionToken: getSessionToken(),
    },
    script,
  });
  return data;
};

// 结果查询
export async function fetchBatchResult(
  batchId: string,
): Promise<{ success: number; fail: number; count: number; items: any; failItems: any }> {
  return fetch.get('/parse/api/items/batch/result/' + batchId);
}

// 进度查询
export async function fetchBatchProgress(batchId: string): Promise<{
  success: number;
  fail: number;
  count: number;
}> {
  return fetch.get('/parse/api/items/batch/progress/' + batchId);
}
