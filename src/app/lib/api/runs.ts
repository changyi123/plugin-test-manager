import _, { isEqual, keyBy, merge } from 'lodash';

import {
  createTestEntities,
  createTestRelation,
  getTestEntities,
  getTestEntitiesByQuery,
  getTestEntitiesByRelation,
} from '@/lib/api/common';
import { getItemByIQL } from '@/lib/api/proxima';
import { TestRelationType, TestType } from '@/lib/constants';
import Parse from '@/lib/parse';
import { Status, TestEntity, UserPointerInfo } from '@/lib/types/Test';
import { hasArrayItem } from '@/lib/utils/helper';
import { generateSortIndex, pointerTransfer, toArray } from '@/lib/utils/helper';
import { compactStepModel } from '@/lib/utils/modelTransfer';

import { Item, ItemLink, ItemLinkType, ItemType, Test } from '../models';
import { ICommonRes } from './detail';
import { getTestEntityByQuery } from './item';

type TestRunEntity = TestEntity<TestType.Run>;
type TestEntityParseType = any;

/**
 * @deprecated
 * 创建测试执行实体，并将测试执行与测试执行任务，测试用例与测试执行任务关联
 */
export const createTestRunAndRelation = async (_testExecutionEntity, _testDetailEntity) => {
  // 转换测试实体
  const testExecutionEntity = pointerTransfer(Test, _testExecutionEntity);
  const testDetailIds = (
    Array.isArray(_testDetailEntity) ? _testDetailEntity : [_testDetailEntity]
  ).map(item => item?.objectId ?? item);

  // 创建测试执行时需要重新获取 testDetailEntity
  const testExecutionData = testExecutionEntity.toJSON();

  // 批量创建，在测试执行页面存在批量创建多个测试详情实体
  const testRunEntities = await createTestRun({
    testDetailIds,
    workspaceKey: testExecutionData.workspaceKey,
  });

  await createTestRelation([
    ...testRunEntities.map(testDetailEntity => ({
      relationType: TestRelationType.DetailRelExecution,
      from: testDetailEntity,
      to: testExecutionEntity,
    })),
    ...testRunEntities.map(testRunEntity => ({
      relationType: TestRelationType.ExecutionRelRun,
      from: testExecutionEntity,
      to: testRunEntity,
    })),
  ]);
};

/** 获取测试用例下的所有测试执行 */
export const getTestRunsAndExecutions = async (testDetailEntity, queryParams) => {
  const testDetailData = testDetailEntity.toJSON();
  const allTestExecutions = await getTestEntitiesByRelation(
    TestRelationType.DetailRelExecution,
    {
      from: testDetailEntity,
    },
    {
      fillItemData: true,
      queryParams,
      async resultTransfer(result) {
        // 获取测试执行任务关联的测试执行
        const { list: allTestRuns } = await getTestEntitiesByRelation(
          TestRelationType.ExecutionRelRun,
          {
            from: result.list.map(item => item.objectId),
          },
          {
            queryParams: { limit: 9999 },
          },
        );

        const testRunRelationDict = _.chain(allTestRuns)
          .filter(run => run.runReferenceDetail?.objectId === testDetailData.objectId)
          .keyBy('relation.from.objectId')
          .value();

        return Object.assign({}, result, {
          // 增加 relTestRun 字段
          list: result.list.map(item => ({
            ...item,
            relTestRun: testRunRelationDict[item.objectId],
          })),
        });
      },
    },
  );

  return allTestExecutions;
};

export const toggleTestRunStatus = (
  testId: string,
  status: Status,
  planId?: string,
): Promise<ICommonRes> => {
  return new Promise((resolve, reject) => {
    Test.createWithoutData(testId)
      .fetch()
      .then(testRun => {
        const refDetail = testRun.get('runReferenceDetail');
        testRun.set({
          status: status.key,
        });
        // 同步修改关联的 detail 状态
        planId &&
          refDetail.set({
            // status: status.key,
            detailStatus: {
              ...(refDetail.get('detailStatus') ?? {}),
              [planId]: status.key,
            },
          });
        return Parse.Object.saveAll([testRun, refDetail]);
      })
      .then(() => {
        resolve({
          success: true,
        });
      })
      .catch(() => {
        reject({
          success: false,
        });
      });
  });
};

export interface IItemLink {
  destination: string;
  source: string;
  linkType: string;
}

// 获取所有已存在的 itemLink
export const getExistedItemLinks = async (links: IItemLink | Array<IItemLink>) => {
  links = Array.isArray(links) ? links : [links];
  const itemLinkAttrs = links.map(link => ({
    destination: pointerTransfer(Item, link.destination),
    source: pointerTransfer(Item, link.source),
    linkType: pointerTransfer(ItemLinkType, link.linkType),
  }));

  const subQueries = itemLinkAttrs.map(link =>
    new Parse.Query(ItemLink)
      .equalTo('source', link.source)
      .equalTo('linkType', link.linkType)
      .equalTo('destination', link.destination)
      .include(['destination', 'source', 'linkType']),
  );

  // 查询已经存在的关联
  const existedItemLinks = await new Parse.Query.or(...subQueries).find();

  return existedItemLinks;
};

export const createItemLink = async (links: IItemLink | Array<IItemLink>) => {
  links = Array.isArray(links) ? links : [links];

  const itemLinkAttrs = links.map(link => ({
    destination: pointerTransfer(Item, link.destination),
    source: pointerTransfer(Item, link.source),
    linkType: pointerTransfer(ItemLinkType, link.linkType),
  }));

  const existedItemLinks = await getExistedItemLinks(links);

  // 筛选出需要添加的事项关联
  const needCreateItemLinkAttrs = existedItemLinks.reduce((res, parseObj) => {
    const itemLink = parseObj.toJSON();
    const needComparedValues = {
      source: itemLink.source?.objectId,
      linkType: itemLink.linkType.objectId,
      destination: itemLink.destination?.objectId,
    };
    return res.filter(
      item =>
        !isEqual(needComparedValues, {
          source: item.source?.id,
          destination: item.destination?.id,
          linkType: item.linkType.id,
        }),
    );
  }, itemLinkAttrs);

  return Parse.Object.saveAll(needCreateItemLinkAttrs.map(attr => new ItemLink(attr)));
};

export const deleteItemLink = (links: string[] | string) => {
  const itemLinks = Array.isArray(links) ? links : [links];
  const linkObjs = itemLinks.map(
    id =>
      new ItemLink({
        objectId: id,
      }),
  );
  return Parse.Object.destroyAll(linkObjs);
};

export const addDefect = async (
  itemLinkTypeId: string,
  testId: string,
  defectItemIds: string[],
) => {
  const [
    [testRunEntity],
    {
      list: [testExecution],
    },
  ] = await Promise.all([
    getTestEntities(
      {
        id: testId,
      },
      { include: ['runReferenceDetail.reference'] },
    ),
    getTestEntitiesByRelation(TestRelationType.ExecutionRelRun, { to: testId }),
  ]);

  // 测试执行对应的测试用例的事项 id
  const referenceDetailItemId = testRunEntity?.toJSON()?.runReferenceDetail?.reference?.objectId;

  const itemLinks = defectItemIds.reduce((itemLinks, defectItemId) => {
    // 测试用例事项和缺陷事项关联
    itemLinks.push({
      linkType: itemLinkTypeId,
      source: referenceDetailItemId,
      destination: defectItemId,
    });

    // 测试用例事项和缺陷事项关联
    itemLinks.push({
      linkType: itemLinkTypeId,
      source: testExecution.reference.objectId,
      destination: defectItemId,
    });

    return itemLinks;
  }, [] as IItemLink[]);

  return createItemLink(itemLinks);
};

export const deleteDefect = async (
  itemLinkTypeId: string,
  testId: string,
  defectItemIds: string[],
) => {
  const res = await new Parse.Query(Test)
    .equalTo('objectId', testId)
    .include('runReferenceDetail')
    .first();
  const run = res.toJSON();
  // 测试用例的事项ID
  const testItemId = run?.runReferenceDetail?.reference?.objectId;
  const {
    list: [testExecution],
  } = await getTestEntitiesByRelation(
    TestRelationType.ExecutionRelRun,
    { to: res },
    { include: ['reference'] },
  );
  const testExcItemId = testExecution?.reference?.objectId;
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

export const fetchDefectList = async (
  itemIds: string[],
): Promise<{
  items: any;
}> => {
  const items = await getItemByIQL({ itemId: itemIds });
  const ItemTypeKeys = [];
  items?.items?.forEach(item => {
    if (item?.itemType?.key) {
      ItemTypeKeys.push(item?.itemType?.key);
    }
  });
  return new Promise((resolve, reject) => {
    const query = new Parse.Query(ItemType);
    query.containedIn('key', ItemTypeKeys);
    query
      .find({
        context: {
          displayModule: 'plugin.testManager',
        },
      })
      .then(
        res => {
          const resArray = res?.map(item => item.toJSON());
          items?.items?.forEach(item => {
            resArray?.forEach(item2 => {
              if (item?.itemType?.key === item2.key) {
                item.itemType.icon = item2.icon;
              }
            });
          });

          resolve({
            items: items.items,
          });
        },
        err => {
          reject(err);
        },
      );
  });
};

/** 获取事项关联 */
export const getItemLinkRelation = async (itemId: string) => {
  const query = new Parse.Query(ItemLink);
  query.equalTo('source', pointerTransfer(Item, itemId));
  query.include(['destination.workspace', 'destination.itemType', 'destination.status']);
  const res = await query.find();
  return res.map(item => item.toJSON());
};

/** 更新测试执行 */
export const updateTestRun = async (
  testEntity: Parse.Object<TestRunEntity> | string,
  params: {
    status?: Status['key'];
    planId?: string;
    steps?: Record<string, any>[];
    runDetail?: Partial<TestRunEntity['runDetail']>;
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

  if (typeof testEntity === 'string') {
    [testEntity] = (await getTestEntities({
      id: testEntity,
    })) as [Parse.Object<TestRunEntity>];
  }

  const testEntityData = testEntity.toJSON();
  const needUpdateAttrs = {} as TestRunEntity;

  if (Array.isArray(params.steps)) {
    const steps = params.steps.map(compactStepModel);
    Object.assign(needUpdateAttrs, {
      runDetail: {
        ...testEntityData.runDetail,
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
        testEntityData.runDetail,
        needUpdateAttrs.runDetail,
        params.runDetail,
      ),
    });
  }

  if (params.comments) {
    Object.assign(needUpdateAttrs, {
      comments: params.comments,
    });
  }

  // testRun 状态更新需要映射到关联的测试用例
  if (needUpdateAttrs.status && params.planId) {
    const testDetailEntity = testEntity as unknown as Parse.Object;
    testDetailEntity.save('detailStatus', {
      ...(testDetailEntity.get('detailStatus') ?? {}),
      [params.planId]: needUpdateAttrs.status,
    });
  }

  testEntity.set('updatedBy', Parse.User.current());

  return testEntity.save(needUpdateAttrs);
};

/** 批量更新测试执行状态 */
export const updateTestRunStatus = async (params: {
  status: string;
  testRunIds: string[];
  planId?: string;
}) => {
  const existedTestRuns = await getTestEntities({
    id: toArray(params.testRunIds),
  });
  const userInfo = await Parse.User.current();
  /** 设置最新操作执行人 */
  const getCurrentUserInfo = () => {
    const user = userInfo.toJSON();
    return {
      objectId: user.objectId,
      __type: 'Pointer',
      className: '_User',
    } as UserPointerInfo;
  };
  const needUpdatedTestEntities = existedTestRuns.reduce((acc, testRun) => {
    testRun.set('status', params.status);
    // 更新状态需要
    testRun.set('executor', [getCurrentUserInfo(), ...(testRun.get('executor') ?? [])].slice(0, 3));
    // 更新对应的测试用例状态
    const runReferenceDetail = testRun.get('runReferenceDetail');
    runReferenceDetail.set('detailStatus', {
      ...(runReferenceDetail.get('detailStatus') ?? {}),
      [params.planId]: params.status,
    });
    return acc.concat(testRun, runReferenceDetail);
  }, []);

  return Parse.Object.saveAll(needUpdatedTestEntities);
};
/** 从测试执行中获取测试步骤 */
export const getTestStepsByTestDetailId = async (testDetailId: string, currentTestId?: string) => {
  // 获取测试步骤
  const fetchTestStepsAndName = async (id: string | string[]) => {
    // const testEntities = await getTestEntities({ id }, { include: ['reference'] });
    const { list: testData } = await getTestEntityByQuery({
      query: {
        id: Array.isArray(id) ? id : [id],
      },
    });

    return testData.map((item, index) => ({
      index,
      id: item.objectId,
      name: item.name,
      steps: item.detail?.steps ?? [],
    }));
  };

  let callTestDeps = (currentTestId ? { [currentTestId]: true } : {}) as Record<string, any>; // 处理循环继承

  // 获取 testSteps, 将继承测试用例（callTestId） -> 测试步骤
  const recursiveGetTestSteps = async (id: string | string[]) => {
    const testData = await fetchTestStepsAndName(id);

    const callTestIds = _.chain(testData)
      .map(data => data.steps)
      .flattenDeep()
      .map(data => data.callTestId)
      .uniq()
      .filter(Boolean)
      .value() as unknown as string[];

    // 存在循环继承，只要有一个 id 在 dep 中，则存在循环继承
    const circularTestId = callTestIds.find(id => callTestDeps[id]);
    if (circularTestId != null) {
      const circularName = testData.find(data =>
        data.steps.some(step => step.callTestId === circularTestId),
      )?.name;

      throw new Error(circularName);
    }

    callTestDeps = Object.assign({}, callTestDeps, keyBy(testData, 'id'));

    if (!hasArrayItem(callTestIds)) {
      return _.chain(testData)
        .map(data => data.steps)
        .flattenDeep()
        .value();
    } else {
      await recursiveGetTestSteps(callTestIds);

      return _.chain(testData)
        .map(data => data.steps)
        .flattenDeep()
        .map(step => {
          if (!step.callTestId) return step;
          return callTestDeps[step.callTestId]?.steps || [];
        })
        .flattenDeep()
        .value();
    }
  };

  return recursiveGetTestSteps(testDetailId);
};

/**
 * 创建测试执行
 */
export const createTestRun = async (params: { workspaceKey: string; testDetailIds: string[] }) => {
  const { workspaceKey, testDetailIds } = params;

  const { results: testDetailEntities } = await getTestEntitiesByQuery(
    {
      in: testDetailIds,
      type: TestType.Case,
    },
    {
      offset: 0,
      limit: 9999,
      select: ['sortIndex'],
    },
  );

  // 批量 sortIndex
  const batchSortIndex = generateSortIndex();
  const entities = testDetailEntities.map((testDetail, index) => ({
    type: TestType.Run,
    workspaceKey,
    fields: {
      runReferenceDetail: Test.createWithoutData(testDetail.objectId),
      // 测试执行的排序索引继承自 sortIndex
      sortIndex: testDetail.sortIndex ?? batchSortIndex + index,
    },
  }));
  return createTestEntities(entities);
};

/** 创建测试执行 */
export const createTestExecutionAndRelations = async (params: {
  workspaceKey: string;
  testPlan: TestEntityParseType;
  testExecution: TestEntityParseType;
  relTestDetailIds?: string[];
}) => {
  /**
   *  s1. 查找所有的关联的测试用例
   *  s2. 创建测试执行事项
   *  s3. 创建测试执行实体
   *  s4. 处理关联关系，测试计划关联测试执行，测试执行关联测试执行
   */

  const { workspaceKey, testPlan, testExecution } = params;
  let relTestDetailIds = params.relTestDetailIds || [];

  // 没有 relTestDetails 则创建全部
  if (!hasArrayItem(relTestDetailIds)) {
    const res = await getTestEntitiesByRelation(
      TestRelationType.PlanRelDetail,
      { from: testPlan },
      // TODO: fetch all
      {
        queryParams: { limit: 9999 },
        // workspaceKey,
      },
    );
    relTestDetailIds = res.list.map(item => item.objectId);
  }

  const testRunEntities = await createTestRun({
    workspaceKey,
    testDetailIds: relTestDetailIds,
  });

  const testPlanExecutionRelations = [
    {
      from: testPlan,
      to: testExecution,
      relationType: TestRelationType.PlanRelExecution,
    },
  ];

  // 测试执行&运行关联关系
  const testExecutionRunRelations = testRunEntities.map(runEntity => ({
    relationType: TestRelationType.ExecutionRelRun,
    from: testExecution,
    to: runEntity,
  }));

  // todo: 创建测试执行
  const relations = [].concat(testPlanExecutionRelations, testExecutionRunRelations);

  await createTestRelation(relations);

  return testExecution;
};

/** 添加测试计划到测试执行 */
export const addTestDetailToExecution = async (params: {
  workspaceKey: string;
  testPlan?: TestEntityParseType;
  testDetail: TestEntityParseType | TestEntityParseType[];
  testExecution: TestEntityParseType;
}) => {
  const testDetailIds = toArray(params.testDetail).map(item => item?.objectId ?? item);
  const { testPlan, workspaceKey, testExecution } = params;

  const testRunEntities = await createTestRun({
    testDetailIds,
    workspaceKey,
  });

  // 测试执行&运行关联关系
  const testExecutionRunRelations = testRunEntities.map(runEntity => ({
    relationType: TestRelationType.ExecutionRelRun,
    from: testExecution,
    to: runEntity,
  }));

  let testPlanDetailRelations = [];

  if (testPlan) {
    const res = await getTestEntitiesByRelation(
      TestRelationType.PlanRelDetail,
      { from: testPlan },
      // TODO: fetch all
      { queryParams: { limit: 9999 } },
    );
    const allRelTestDetailIds = res.list.map(item => item.objectId);
    // 未作关联的测试计划
    const needRelTestDetailIds = testDetailIds.filter(id => !allRelTestDetailIds.includes(id));

    testPlanDetailRelations = needRelTestDetailIds.map(testDetailId => ({
      relationType: TestRelationType.PlanRelDetail,
      from: testPlan,
      to: testDetailId,
    }));
  }

  await createTestRelation(testExecutionRunRelations.concat(testPlanDetailRelations));
};

// 根据测试用例获取测试执行,
export const getTestRunsByTestDetails = async ({ testDetailIds, workspaceKey, executionIds }) => {
  if (!testDetailIds?.length) return null;
  const testQuery = new Parse.Query(Test);

  testQuery
    .equalTo('workspaceKey', workspaceKey)
    .equalTo('type', TestType.Run)
    .containedIn('runReferenceDetail', testDetailIds);

  const testRunsList = await testQuery.findAll();

  const tuns = await getTestEntitiesByRelation(
    TestRelationType.ExecutionRelRun,
    {
      from: executionIds,
    },
    {
      workspaceKey,
      include: ['objectId'],
      select: ['objectId'],
      queryParams: { limit: 9999 },
      async resultTransfer(data) {
        const ids = data?.list?.map(d => d.objectId);
        const runs = testRunsList.map(d => d.toJSON()).filter(d => ids.includes(d.objectId));

        return {
          list: runs,
          count: testRunsList?.length ?? 0,
        };
      },
    },
  );

  return tuns.list;
};
