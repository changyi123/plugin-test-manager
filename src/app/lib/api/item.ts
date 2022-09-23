import fetch from '@/lib/utils/fetch';
import {
  TestCaseStatsPayload,
  TestPlanStatsPayload,
  QueryTestEntityPayload,
  TestExecutionStatsPayload,
  QueryLinkedTestEntityPayload,
} from 'common/types/api';
import { merge } from 'lodash';
import { lib } from 'proxima-sdk';
import { RepositoryModel, TestType } from '../constants';
import { BaseTestEntity, Status, TestEntity, UserPointerInfo } from '../types/Test';
import { getPluginWebTriggerBaseUrl } from '../utils/helper';
import { compactStepModel } from '../utils/modelTransfer';
import { createItemLink, deleteItemLink, IItemLink, getExistedItemLinks } from './runs';
const { selectorToIql } = lib.Iql;

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

const handleSelector = selector => {
  if (!selector) return null;
  const testSelector = Object.entries(selector?.[1] ?? {}).reduce(
    (prev: Record<string, any>, [filed, value]: any[]) => {
      if (RepositoryModel === filed) {
        prev[filed] = {
          ...value,
          component: 'Dropdown',
        };
      } else {
        prev[filed] = value;
      }

      return prev;
    },
    {},
  );

  return {
    ...(selector?.[0] ?? {}),
    ...testSelector,
  };
};

// 查询测试用例事项
export const getTestEntityByQuery = async (props: QueryTestEntityPayload) => {
  const _props = Object.assign(
    { descending: [], onlySelectId: false },
    { ...props, selector: selectorToIql(handleSelector(props.selector)) },
  );

  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-query-test-entity`, _props);

  return {
    list: data.list ?? [],
    total: data.total ?? [],
  };
};

// 关联查询
export const getlinkedTestEntityByQuery = async (props: QueryLinkedTestEntityPayload) => {
  const _props = Object.assign(
    { descending: [], onlySelectId: false },
    { ...props, selector: selectorToIql(handleSelector(props.selector)) },
  );

  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-query-linked-test-entity`, _props);

  return {
    list: data.list ?? [],
    total: data.total ?? 0,
  };
};

// 测试计划统计查询
export const getStatsTestPlan = async (props: TestPlanStatsPayload) => {
  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-plan`, props);

  return data;
};

// 测试执行任务统计查询
export const getStatsTestExecution = async (props: TestExecutionStatsPayload) => {
  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-execution`, props);

  return data;
};

// 测试用例统计查询
export const getTestCaseStats = async (props: TestCaseStatsPayload) => {
  const {
    data: { data },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-case`, props);

  return data;
};

// 批量删除测试实体事项
export const deleteTestEntity = async ids => {
  const res = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-delete`, {
    ids,
  });

  return res;
};

// 批量更新测试实体事项
export const updateTestEntity = async data => {
  const { data: itemData } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-update`, {
    data,
  });

  return itemData?.data;
};

export const batchCreateTestRun = async data => {
  const res = await fetch.post(`${pluginWebTriggerBaseUrl}/api-batch-create-test-run`, data);

  return res;
};

// 批量更新测试执行状态
export const updateTestStatus = async data => {
  const { runIds, status, planId } = data;

  // 查询测试执行数据
  const { list } = await getTestEntityByQuery({
    query: {
      id: runIds,
      type: TestType.Run,
    },
    limit: 9999,
  });

  const { list: test } = await getTestEntityByQuery({
    query: {
      id: list.map(d => d.referenceCase) ?? [],
      type: TestType.Case,
    },
    limit: 9999,
  });

  const runs = runIds.map(d => ({
    objectId: d,
    status,
  }));

  const tests = test.map(d => ({
    objectId: d.objectId,
    caseStatus: {
      ...(d?.caseStatus ?? {}),
      [planId]: status,
    },
  }));

  const res = await updateTestEntity(runs.concat(tests));

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
        objectId: user.objectId,
        __type: 'Pointer',
        className: '_User',
      } as UserPointerInfo;
    };
    // 最新操作执行人存最近三条数据，多存无意
    needUpdateAttrs.executor = [getCurrentUserInfo(), ...(needUpdateAttrs.executor ?? [])].slice(
      0,
      3,
    );
  };
  opts = merge({ initialization: false }, opts);

  const needUpdateAttrs = {} as TestEntity<TestType.Run>;

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
      // 全部 pass
      const hasAllPass = steps.every(item => item.status === 'PASSED');
      // 全部 todo
      const hasAllTodo = steps.every(item => item.status === 'TODO');

      if (hasFail) {
        needUpdateAttrs.status = 'FAILED';
      } else if (hasExecuting) {
        needUpdateAttrs.status = 'EXECUTING';
      } else if (hasAllPass) {
        needUpdateAttrs.status = 'PASSED';
      } else if (hasAllTodo) {
        needUpdateAttrs.status = 'TODO';
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
    });

    needUpdateCase = test.map(d => ({
      objectId: d.objectId,
      caseStatus: {
        ...(d?.caseStatus ?? {}),
        [params.planId]: needUpdateAttrs.status,
      },
    }));
  }

  await updateTestEntity([
    {
      objectId: testEntity.objectId,
      ...needUpdateAttrs,
    },
    ...needUpdateCase,
  ]);
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
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-plan`, data);

  return res;
};

// 通过测试用例去查任务数
export const getRunsFromCase = async (data: TestCaseStatsPayload) => {
  const {
    data: { data: res },
  } = await fetch.post(`${pluginWebTriggerBaseUrl}/api-stats-test-case`, data);
  return res;
};
