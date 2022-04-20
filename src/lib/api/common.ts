import Parse from '@/lib/parse';
import { TestConfig } from '../models';
import { assign, omit, transform } from 'lodash';
import { Workspace, Item, Test, TestRelation } from '@/lib/models';
import { TestType, TestRelationType } from '@/lib/constants';
import { hasArrayItem, pointerTransfer, toArray, escapeMatchesQueryArg } from '@/lib/utils/helper';

const BATCH_SIZE = 200;

/** to/from -> pointer */
const testRelationTypePointerTransfer = arr =>
  hasArrayItem(arr) ? arr.map(item => pointerTransfer(TestRelation, item)) : [];

/**
 * FIXME: 后续需要优化此方法
 * 根据关联类型查询测试实体，顺序无法保证
 */
export const getTestEntitiesByRelation = async <TResponseList extends any[] = any[]>(
  relType: TestRelationType,
  sides: Partial<Record<'from' | 'to', Array<PointerType> | PointerType>> = {},
  _config?: any,
): Promise<{
  total: number;
  list: TResponseList;
}> => {
  const config = assign(
    {},
    {
      // 响应数据处理
      resultTransfer: data => data,
      fillItemData: false,
      include: [],
      // 需要关联方 id
      needOriginSideId: true,
      select: [],
      workspaceKey: '',
      queryParams: { limit: 10, offset: 0 },
      nameLike: '',
    },
    _config,
  );

  if (config.descendingBy) {
    throw new Error('该方法不支持排序使用 getTestEntitiesByRelationWithOrder 方法替代');
  }

  // 查另一向的关联关系
  const sideMapping = {
    from: 'to',
    to: 'from',
  };
  // 查询必须要要有关联类型
  if (!relType) return;
  // 测试实体 key
  let relationSideKey = '';
  let { include, select } = config;
  if (config.fillItemData) {
    include = include.concat('reference');
    select = select.concat('reference');
  }
  const query = new Parse.Query(TestRelation).equalTo('relationType', relType);

  // 只支持单方关联查询
  Object.entries(sides).forEach(([sideKey, side]) => {
    // 支持数组的关联关系查询
    if (Array.isArray(side)) {
      query.containedIn(sideKey, testRelationTypePointerTransfer(side));
    } else {
      query.equalTo(sideKey, pointerTransfer(Test, side as PointerType));
    }
    relationSideKey = sideMapping[sideKey];
  });

  // 如果 include 不是一个数组则用默认的 include
  const includeKeys = hasArrayItem(include)
    ? include
        .map(includeKey => {
          // 性能优化: key 为 objectId 时过滤，减少请求响应大小
          if (includeKey === 'objectId') return;
          return `${relationSideKey}.${includeKey}`;
        })
        .filter(Boolean)
    : [relationSideKey];

  // 如果有 select 事项追加至 query
  if (select || config.needOriginSideId) {
    const select = (Array.isArray(config.select) ? config.select : [config.select]).map(
      key => `${relationSideKey}.${key}`,
    );
    const otherSide = config.needOriginSideId && `${sideMapping[relationSideKey]}.objectId`;
    const selectKeys = [relationSideKey, otherSide, ...select].filter(Boolean);
    query.select(selectKeys);
  }

  if (hasArrayItem(includeKeys)) {
    // 需要获取关联事项的实体
    query.include(includeKeys);
  }

  query.withCount();

  // 测试执行实体不是一个 proxima 事项。当查询执行的时候需要给排除
  const useItemSubQuery =
    relType !== TestRelationType.ExecutionRelRun || relationSideKey !== sideMapping.from;

  if (useItemSubQuery) {
    const referenceItemQuery = new Parse.Query(Item);
    if (config?.nameLike) {
      referenceItemQuery.matches('name', escapeMatchesQueryArg(config.nameLike));
    }
    if (config.workspaceKey) {
      referenceItemQuery.matchesKeyInQuery(
        'workspace',
        'objectId',
        new Parse.Query(Workspace).equalTo('key', config.workspaceKey),
      );
    }
    query.matchesQuery(
      relationSideKey,
      new Parse.Query(Test).matchesQuery('reference', referenceItemQuery),
    );
  }

  if (config?.queryParams && typeof config?.queryParams === 'object') {
    const { queryParams } = config;
    query.limit(queryParams.limit ?? 0);
    query.skip(queryParams.offset ?? 0);
  }

  const { results, count } = await query.find();

  // 生成标准数据
  const buildReturnData = async list => {
    const responseData = {
      list,
      total: count,
    };
    if (typeof config.resultTransfer === 'function') {
      // 响应数据处理
      return config.resultTransfer(responseData);
    }
    return responseData;
  };
  // 需要填充 item 数据则自动转换未 json 格式，非批量数据不做处理
  if (Array.isArray(results)) {
    const itemIds = [];
    const testEntitiesData = results.map(relation => {
      const relationData = relation.toJSON();
      // 从 relation 中获取测试实体， from or to 查批量数据
      const testEntityData = relationData[relationSideKey];
      // 防止为空
      if (testEntityData?.reference?.objectId) {
        itemIds.push(testEntityData?.reference?.objectId);
        // 兼容test runs
      } else if (testEntityData?.runReferenceDetail?.reference?.objectId) {
        itemIds.push(testEntityData?.runReferenceDetail?.reference?.objectId);
      }

      // 当前关联数据
      const assignData = config.entityOnly
        ? {}
        : { relation: relationData, testRelationId: relationData.objectId };

      return {
        ...testEntityData,
        ...assignData,
      };
    });
    return buildReturnData(testEntitiesData);
  }
  // 异常响应数据兼容处理
  return buildReturnData([]);
};

/**
 * 根据关联类型查询测试实体，支持排序
 */
export const getTestEntitiesByRelationWithOrder = async <TResponseList extends any[] = any[]>(
  relType: TestRelationType,
  sides: Partial<Record<'from' | 'to', Array<PointerType> | PointerType>> = {},
  _config?: any,
): Promise<{
  total: number;
  list: TResponseList;
}> => {
  const config = assign(
    {},
    {
      // 响应数据处理
      include: [],
      select: [],
      nameLike: '',
      workspaceKey: '',
      // 需要关联方 id
      needOriginSideId: true,
      // 需要关联关系数据
      needRelationData: true,
      ascendingBy: ['sortIndex', 'createdAt'],
      descendingBy: [],
      resultTransfer: data => data,
      queryParams: { limit: 10, offset: 0 },
    },
    _config,
  );

  let { include, select } = config;
  if (config.fillItemData) {
    include = include.concat('reference');
    select = select.concat('reference');
  }

  // 查另一向的关联关系
  const sideMapping = {
    from: 'to',
    to: 'from',
  };
  // 查询必须要要有关联类型
  if (!relType) return;
  // 测试实体 key
  const originalSideKey = Object.keys(sides).filter(Boolean)[0];
  const relationSideKey = sideMapping[originalSideKey];

  // 关联方 objectId
  const originalSideIds = toArray(sides[originalSideKey])
    .filter(Boolean)
    .map(item => item?.objectId ?? item);

  const query = new Parse.Query(Test);

  // 处理关联表子查询
  const testRelationQuery = new Parse.Query(TestRelation)
    .equalTo('relationType', relType)
    .containedIn(originalSideKey, originalSideIds);

  query.matchesKeyInQuery('objectId', relationSideKey, testRelationQuery);

  // 测试执行实体不是一个 proxima 事项。当查询执行的时候需要给排除
  const useItemSubQuery =
    relType !== TestRelationType.ExecutionRelRun || relationSideKey !== sideMapping.from;

  if (useItemSubQuery) {
    // 处理事项关联子查询
    const referenceItemQuery = new Parse.Query(Item);
    if (config.nameLike) {
      referenceItemQuery.matches('name', escapeMatchesQueryArg(config.nameLike));
    }

    // name like 应该需要传 workspaceKey 避免全表查询
    if (config.workspaceKey) {
      referenceItemQuery.matchesKeyInQuery(
        'workspace',
        'objectId',
        new Parse.Query(Workspace).equalTo('key', config.workspaceKey),
      );
    }

    query.matchesKeyInQuery('reference', 'objectId', referenceItemQuery);
  }

  if (hasArrayItem(include)) {
    query.include(include);
  }

  if (hasArrayItem(select)) {
    query.include(select);
  }

  if (config.ascendingBy) {
    query.addAscending(config.ascendingBy);
  } else if (config.descendingBy) {
    query.addDescending(config.descendingBy);
  }

  if (config.queryParams && typeof config.queryParams === 'object') {
    const { queryParams } = config;
    query.limit(queryParams.limit ?? 10);
    query.skip(queryParams.offset ?? 0);
  }

  query.withCount(true);

  const { results, count } = await query.find();

  const resultData = results.map(item => item.toJSON());

  // 生成标准数据
  const buildReturnData = async list => {
    const responseData = {
      list,
      total: count,
    };
    if (typeof config.resultTransfer === 'function') {
      // 响应数据处理
      return config.resultTransfer(responseData);
    }
    return responseData;
  };

  return buildReturnData(resultData);
};

/**
 * 根据测试实体查询测试实体关联
 */
export const getAllTestRelations = ({
  from,
  to,
}: Partial<Record<'from' | 'to', Array<string | Parse.Object>>>) => {
  return Parse.Query.or(
    new Parse.Query(TestRelation).containedIn('from', testRelationTypePointerTransfer(from)),
    new Parse.Query(TestRelation).containedIn('to', testRelationTypePointerTransfer(to)),
  ).find();
};

/**
 * 创建测试实体关联关系
 */
export const createTestRelation = (
  _relations: Array<{
    to: string | Parse.Object;
    from: string | Parse.Object;
    relationType: TestRelationType;
  }>,
) => {
  const relations = _relations.map(
    rel =>
      new TestRelation({
        to: pointerTransfer(Test, rel.to),
        from: pointerTransfer(Test, rel.from),
        relationType: rel.relationType,
      }),
  );

  return Parse.Object.saveAll(relations, { batchSize: BATCH_SIZE });
};

/**
 * 解除关联关系
 */

export const removeTestRelations = (_relations: Array<PointerType>) => {
  const relations = _relations.map(rel => pointerTransfer(TestRelation, rel));

  return Parse.Object.destroyAll(relations, { batchSize: BATCH_SIZE });
};

/** 根据关联条件接触关联关系 */
export const removeTestRelationsWithCondition = async (
  relType: TestRelationType,
  sides: Partial<Record<'from' | 'to', Array<PointerType> | PointerType>> = {},
) => {
  const query = new Parse.Query(TestRelation).equalTo('relationType', relType);

  Object.entries(sides).forEach(([sideKey, value]) => {
    query.containedIn(
      sideKey,
      toArray(value).map(item => item?.objectId ?? item),
    );
  });

  query.select(['objectId']).limit(9999);

  const testRelations = await query.find();

  return removeTestRelations(testRelations);
};

/**
 * 删除测试实体
 */
export const deleteTestEntities = async (testEntities: Array<Parse.Object | string>) => {
  testEntities = testEntities.map(item =>
    typeof item === 'string' ? new Test({ objectId: item }) : item,
  );
  // 测试实体对应的关联关系也需要被删除
  const testRelations = await getAllTestRelations({ from: testEntities, to: testEntities });

  return Parse.Object.destroyAll(testEntities.concat(testRelations));
};

/**
 * 创建测试实体
 */
export const createTestEntities = (
  entities: Array<{
    type: TestType;
    itemId?: string;
    workspaceKey: string;
    fields?: Record<string, unknown>;
  }>,
) => {
  const newTestEntities = entities.map(
    entity =>
      new Test({
        type: entity.type,
        workspaceKey: entity.workspaceKey,
        reference: entity.itemId ? Item.createWithoutData(entity.itemId) : null,
        ...(entity.fields || {}),
      }),
  );

  return Parse.Object.saveAll(newTestEntities, { batchSize: BATCH_SIZE });
};

/**
 * 获取测试实体
 */
export const getTestEntities = (
  params: { itemId?: string | string[]; id?: string | string[] },
  _config?: {
    include?: string[];
    orderBy?: string;
  },
) => {
  const query = new Parse.Query(Test);
  const config = assign({ include: ['reference.workspace', 'reference.itemType'] }, _config);

  if (Array.isArray(config.include)) {
    query.include(config.include);
  }

  if (params?.id) {
    query.containedIn('objectId', toArray(params.id));
  }

  if (params?.itemId) {
    query.containedIn('reference', toArray(params.itemId));
  }

  return query.find();
};

/** 获取测试实体 by parse query */
export const getTestEntitiesByQuery = async (
  queryParams?: Partial<{
    in: string[];
    type: TestType;
    notIn: string[];
    nameLike: string;
    workspaceKey: string;
  }>,
  options?: Partial<{
    offset: number;
    limit: number;
    descendingBy: string[];
    ascendingBy: string[];
    include: string[];
    select: string[];
    ignoreDeletedItemData: boolean;
  }>,
) => {
  const query = new Parse.Query(Test);

  queryParams = queryParams ?? {};
  options = assign(
    {},
    {
      ignoreDeletedItemData: true,
      ascendingBy: ['sortIndex', 'createdAt'],
      include: ['reference.workspace', 'reference.itemType'],
    },
    options,
  );

  // 处理数组类型查询参数
  const escapeArrayTypeParams = paramValue => {
    return paramValue.filter(Boolean);
  };

  // 处理查询参数
  if (queryParams.type) {
    query.equalTo('type', queryParams.type);
  }

  if (queryParams.workspaceKey) {
    query.equalTo('workspaceKey', queryParams.workspaceKey);
  }

  // 忽略被删除事项数据
  if (queryParams.nameLike || options.ignoreDeletedItemData) {
    const itemSubQuery = new Parse.Query(Item);
    if (queryParams.nameLike) {
      itemSubQuery.matches('name', escapeMatchesQueryArg(queryParams.nameLike));
    }
    if (options.ignoreDeletedItemData && queryParams.workspaceKey) {
      itemSubQuery.matchesKeyInQuery(
        'workspace',
        'objectId',
        new Parse.Query(Workspace).equalTo('key', queryParams.workspaceKey),
      );
    }
    query.matchesKeyInQuery('reference', 'objectId', itemSubQuery);
  }

  if (queryParams.in) {
    query.containedIn('objectId', escapeArrayTypeParams(queryParams.in));
  }

  if (queryParams.notIn) {
    query.notContainedIn('objectId', escapeArrayTypeParams(queryParams.notIn));
  }

  // 需要加上 count 数据
  query.withCount(true);

  // 处理条件
  if (options.select) {
    query.select(options.select);
  }

  if (options.offset != null) {
    query.skip(options.offset ?? 0);
  }

  if (options.limit != null) {
    query.limit(options.limit ?? 10);
  }

  if (options.descendingBy) {
    query.addDescending(options.descendingBy);
  } else if (options.ascendingBy) {
    query.addAscending(options.ascendingBy);
  }

  if (options.include) {
    query.include(options.include);
  }

  const data = await query.find();

  // 对分页响应的数据结构进行兼容
  return {
    ...data,
    results: data.results.map(item => item.toJSON()),
  };
};

/**
 * 获取测试管理配置
 */
export const getTestConfig = (params: {
  workspaceKey?: string;
  global?: boolean;
}): Promise<Parse.Object> => {
  const query = new Parse.Query(TestConfig);
  if (params.workspaceKey) {
    query.equalTo('workspaceKey', params.workspaceKey);
  }

  if (typeof params.global === 'boolean') {
    query.equalTo('global', params.global);
  }

  return query.first();
};

/**
 * 对全部测试管理配置进行更新
 */
export const updateAllTestConfigs = async fields => {
  const testConfigs = await new Parse.Query(TestConfig).notEqualTo('global', true).findAll();

  const needUpdatedTestConfigs = testConfigs.map(testConfig => testConfig.set(fields));
  await Parse.Object.saveAll(needUpdatedTestConfigs);
};

/**
 * 新建测试管理
 */
export const createEmptyTestConfig = (workspaceKey: string) => {
  const testConfig = new TestConfig({
    workspaceKey,
    global: false,
    itemTypeMap: {},
    defectsMapping: [],
    // 默认所有事项都加上空间隔离
    isolateTestType: [
      TestType.TestPlan,
      TestType.TestDefect,
      TestType.TestDetail,
      TestType.TestExecution,
    ],
  });

  return testConfig.save();
};

/**
 * 获取租户下所有空间测试管理配置（制作单租户）
 */

export const getAllTestConfigs = (selectKeys?: string[]) => {
  const query = new Parse.Query(TestConfig);
  if (hasArrayItem(selectKeys)) {
    query.select(selectKeys);
  }
  return query.findAll();
};

/**
 * 获取整个租户测试类型关联的事项类型
 */
export const getItemTypeMap = () => {
  return new Parse.Query(TestConfig).reduce((res, { itemTypeMap }) => {
    res = Object.entries(itemTypeMap);
    return res;
  }, {});
};

/**
 * 获取空间模板已经配置过的 itemTypes（界面方案中使用的 itemType）
 */
export const getUsefulItemTypes = (workspaceId: string) => {
  return new Parse.Query(Workspace)
    .includes(['workspaceTemplate'])
    .equalTo('workspace', workspaceId);
};

/** 克隆测试实体 */
export const cloneTestEntities = async (testEntityIds: string[]) => {
  const pointerObjectMapping = { reference: Item, runReferenceDetail: Test };
  const newTestEntities = await new Parse.Query(Test)
    .containedIn('objectId', testEntityIds)
    .map(item => {
      const values = transform(
        omit(item.toJSON(), ['objectId', 'status']),
        (acc, value, key) => {
          if (pointerObjectMapping[key]) {
            acc[key] = pointerObjectMapping[key].createWithoutData(value.objectId);
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {},
      );
      return new Test(values);
    });

  return Parse.Object.saveAll(newTestEntities);
};

/** 更新全局配置 */
export const updateGlobalConfig = async fields => {
  const globalConfig = await getTestConfig({ global: true });
  const globalConfigData = globalConfig.toJSON();

  if (Object.prototype.hasOwnProperty.call(fields, 'extra')) {
    fields.extra = Object.assign(globalConfigData.extra, fields.extra);
  }

  await globalConfig.save({
    ...globalConfigData,
    ...fields,
  });
};
