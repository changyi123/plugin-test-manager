import { message } from 'antd';
import {
  QueryLinkedTestEntityPayload,
  QueryTestEntityPayload,
  RepositoryTreePayload,
  TestCaseStatsPayload,
  TestCountPayload,
  TestExecutionStatsPayload,
  TestPlanStatsPayload,
} from 'common/types/api';
import { has, omit, pick } from 'lodash';
import { merge } from 'lodash';

import fetch from '@/lib/utils/fetch';

import {
  RepositoryModel,
  SYSTEM_FIELD,
  TestCaseStatusModel,
  TestRunDesigneeModel,
  TestRunExecutorModel,
  TestType,
} from '../constants';
import { BaseTestEntity, CopyTestCasePayload, Status, TestEntity } from '../types/Test';
import { getPluginWebTriggerBaseUrl, getSessionToken } from '../utils/helper';
import { SearchSelectors, selectorToIql } from '../utils/iql';
import { compactStepModel } from '../utils/modelTransfer';
import { createItemLink, deleteItemLink, getExistedItemLinks, IItemLink } from './runs';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

interface QueryCaseIdByStatusPayload {
  planId: string;
  status: Status['key'] | string[] | null;
  isExclude?: boolean;
}

// 处理筛选器数据
const handleSelector = selector => {
  if (!selector) return null;
  const [systemSelector, customSelector] = selector;
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
export const deleteTestEntity = async ids => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-delete`, {
    ids,
    sessionToken: getSessionToken(),
  });

  if (res.status === 'error') {
    return res;
  }
  return res;
};

// 批量更新测试实体事项
export const updateTestEntity = async data => {
  const { data: res } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-update`, {
    data,
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

// 批量创建测试执行
export const batchCreateTestRun = async data => {
  const res = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-create-test-run`, {
    ...data,
    sessionToken: getSessionToken(),
  });

  return res;
};

// 批量更新测试执行状态
export const updateTestStatus = async data => {
  const { runIds, status, planId } = data;
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

  const { list: testCases } = await getTestEntityByQuery({
    query: {
      id: testRuns.map(d => d.referenceCase) ?? [],
      type: TestType.Case,
    },
    limit: 9999,
    select: ['id', 'caseStatus', 'caseExecutor', 'caseRun'],
  });

  const caseRun = {};

  const updateTestRuns = testRuns.map(d => {
    const isRun = ['PASSED', 'FAILED']?.includes(status);
    const result = {
      objectId: d.id,
      status,
      executor: [getCurrentUserInfo(), ...(d.executor ?? [])].slice(0, 3),
      executeCount: (d.executeCount ?? 0) + (isRun ? 1 : 0),
    };
    if (isRun) {
      Object.assign(result, { executeTime: new Date().getTime() });
      caseRun[d.referenceCase] = {
        [planId]: d.id,
      };
    }

    return result;
  });

  let updateTestCases = [];
  if (planId) {
    updateTestCases = testCases.map(d => ({
      objectId: d.id,
      caseStatus: {
        ...d.caseStatus,
        [planId]: status,
      },
      caseExecutor: {
        ...d.caseExecutor,
        [planId]: getCurrentUserInfo(),
      },
      caseRun: {
        ...d.caseRun,
        ...(caseRun[d.id] || {}), // 记录对应测试计划下的最新测试执行
      },
    }));
  }

  const res = await updateTestEntity([].concat(updateTestRuns, updateTestCases));

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
    needUpdateAttrs.executor = [getCurrentUserInfo(), ...(needUpdateAttrs.executor ?? [])].slice(
      0,
      3,
    );
  };
  opts = merge({ initialization: false }, opts);
  const executeCount = testEntity?.executeCount ?? 0;

  const needUpdateAttrs = {} as TestEntity<TestType.Run>;

  const caseRun = {};

  // 执行状态为通过或者失败，且前后状态不一致 +1
  if (['PASSED', 'FAILED']?.includes(params.status) && testEntity.status !== params.status) {
    needUpdateAttrs.executeCount = executeCount + 1;
    needUpdateAttrs.executeTime = new Date().getTime();
    caseRun[testEntity.referenceCase] = { [params.planId]: testEntity.objectId };
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
    if (!opts.initialization) {
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
          caseRun[testEntity.referenceCase] = { [params.planId]: testEntity.objectId };
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
          caseRun[testEntity.referenceCase] = { [params.planId]: testEntity.objectId };
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

  let needUpdateCase = [];

  // testRun 状态更新需要映射到关联的测试用例
  if (needUpdateAttrs.status && params.planId) {
    const { list: test } = await getTestEntityByQuery({
      query: {
        id: [testEntity.referenceCase],
        type: TestType.Case,
      },
      limit: 9999,
      select: ['id', 'caseStatus', 'caseExecutor', 'caseRun'],
    });

    needUpdateCase = test.map(d => ({
      objectId: d.id,
      caseStatus: {
        ...d.caseStatus,
        [params.planId]: needUpdateAttrs.status,
      },
      caseExecutor: {
        ...d.caseExecutor,
        [params.planId]: needUpdateAttrs.executor?.[0],
      },
      caseRun: {
        ...d.caseRun,
        ...(caseRun[d.id] || {}),
      },
    }));
  }

  const res = await updateTestEntity([
    {
      objectId: testEntity.objectId,
      ...needUpdateAttrs,
    },
    ...needUpdateCase,
  ]);
  return res;
};

// 新增缺陷关联
export const addTestDefect = async (
  itemLinkTypeId: string,
  testRunEntity: TestEntity<TestType.Run>,
  defectItemIds: string[],
) => {
  const itemLinks = defectItemIds.reduce((itemLinks, defectItemId) => {
    // 测试用例事项和缺陷事项关联
    itemLinks.push({
      linkType: itemLinkTypeId,
      source: testRunEntity.objectId,
      destination: defectItemId,
    });

    // 测试用例事项和缺陷事项关联
    itemLinks.push({
      linkType: itemLinkTypeId,
      source: testRunEntity.linkItems[0],
      destination: defectItemId,
    });

    return itemLinks;
  }, [] as IItemLink[]);

  return createItemLink(itemLinks);
};

// 删除缺陷关联
export const deleteTestDefect = async (
  itemLinkTypeId: string,
  run: TestEntity<TestType.Run>,
  defectItemIds: string[],
) => {
  // 测试用例的事项ID
  const testItemId = run?.objectId;
  const testExcItemId = run?.linkItems[0];
  const itemLink: Array<IItemLink> = [];
  defectItemIds.forEach(item => {
    // 测试用例与缺陷关联
    itemLink.push({
      linkType: itemLinkTypeId,
      source: testItemId,
      destination: item,
    });
    // 测试执行与缺陷关联
    itemLink.push({
      linkType: itemLinkTypeId,
      source: testExcItemId,
      destination: item,
    });
  });

  const results = await getExistedItemLinks(itemLink);

  const deleteDefectItemIds: string[] = [];
  itemLink.forEach(item => {
    const deleteItem = results.find(item2 => {
      const { linkType, source, destination } = item2.toJSON();
      if (
        linkType.objectId === item.linkType &&
        source?.objectId === item?.source &&
        destination?.objectId === item?.destination
      ) {
        return item2;
      }
    });
    if (deleteItem) {
      deleteDefectItemIds.push(deleteItem.id);
    }
  });
  return deleteItemLink(deleteDefectItemIds);
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
  const { data } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-module-repository-tree-v2`, {
    ...params,
    sessionToken: getSessionToken(),
  });
  return data;
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
