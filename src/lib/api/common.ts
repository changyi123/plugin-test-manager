import Parse from '@/lib/parse';
import { keyBy, merge } from 'lodash';
import { TestConfig } from '../models';
import { getItemByIQL } from './proxima';
import { TestType, TestRelationType } from '@/lib/constants';
import { hasArrayItem, pointerTransfer } from '@/lib/utils/helper';
import { Workspace, Item, Test, TestRelation } from '@/lib/models';

/** to/from -> pointer */
const testRelationTypePointerTransfer = arr =>
  hasArrayItem(arr) ? arr.map(item => pointerTransfer(TestRelation, item)) : [];

/**
 * 根据关联类型查询测试实体（分页，批量查询，填充 proxima 事项数据）
 */
export const getTestEntitiesByRelation = async <TResponseList extends any[] = any[]>(
  relType: TestRelationType,
  sides: Partial<Record<'from' | 'to', Array<PointerType> | PointerType>> = {},
  _config?: any,
): Promise<{
  total: number;
  list: TResponseList;
}> => {
  try {
    // FIXME: 方案
    // const CacheKey = 'Parse/proxima-core/currentUser';
    // const userJSON = JSON.parse(window.localStorage.getItem(CacheKey));

    Parse.User._clearCache();
    // Parse.User._setCurrentUserCache(Parse.Object.fromJSON(userJSON));

    console.info('用户数据重置成功');
  } catch (err) {
    console.info(err);
  }

  const config = merge(
    {
      // 响应数据处理
      resultTransfer: data => data,
      // 需要填充 item 数据则自动转换未 json 格式
      fillItemData: false,
      include: [],
      // 只需要测试实体数据，不需要关联关系数据
      entityOnly: false,
      queryParams: { limit: 10, offset: 0, orderBy: 'createdAt' },
    },
    _config,
  );
  // 查询必须要要有关联类型
  if (!relType) return;
  // 测试实体 key
  let relationSideKey = '';
  const include = config.include;
  const query = new Parse.Query(TestRelation).equalTo('relationType', relType);

  // 只支持单方关联查询
  Object.entries(sides).forEach(([sideKey, side]) => {
    // 支持数组的关联关系查询
    if (Array.isArray(side)) {
      query.containedIn(sideKey, testRelationTypePointerTransfer(side));
    } else {
      query.equalTo(sideKey, pointerTransfer(Test, side as PointerType));
    }
    // 查另一向的关联关系
    const sideMapping = {
      from: 'to',
      to: 'from',
    };
    relationSideKey = sideMapping[sideKey];
  });

  // 如果 include 不是一个数组则用默认的 include
  const includeKeys = hasArrayItem(include)
    ? include.map(includeKey => `${relationSideKey}.${includeKey}`)
    : [relationSideKey];

  // 如果有 select 事项追加至 query
  if (config.entityOnly) {
    query.select(relationSideKey);
  }

  // 需要获取关联事项的实体
  query.include(includeKeys);
  query.withCount();

  if (config?.queryParams && typeof config?.queryParams === 'object') {
    const queryParams = config.queryParams;
    query.limit(queryParams.limit);
    query.skip(queryParams.offset);
    query.ascending(queryParams.orderBy);
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
  console.log(
    'results',
    results.map(i => i.toJSON()),
  );
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
    if (!config?.fillItemData) return buildReturnData(testEntitiesData);

    // 从 iql 中获取 item 相关数据
    const { items } = await getItemByIQL({ itemId: itemIds, limit: config?.queryParams?.limit });
    const itemMap = keyBy(items, 'objectId');
    const testEntitiesDataWithItemData = testEntitiesData.map(entity => {
      // 第二个兼容test run
      const item =
        itemMap[entity.reference?.objectId || entity?.runReferenceDetail?.reference?.objectId];
      // 测试运行没有关联的事项
      return Object.assign({}, entity, { reference: item || null });
    });
    return buildReturnData(testEntitiesDataWithItemData);
  }
  // 异常响应数据兼容处理
  return buildReturnData([]);
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
    from: string | Parse.Object;
    to: string | Parse.Object;
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

  return Parse.Object.saveAll(relations);
};

/**
 * 解除关联关系
 */

export const removeTestRelations = (_relations: Array<PointerType>) => {
  const relations = _relations.map(rel => pointerTransfer(TestRelation, rel));

  return Parse.Object.destroyAll(relations);
};

/**
 * 删除测试实体
 */
export const deleteTestEntities = (testEntities: Array<Parse.Object | string>) => {
  testEntities = testEntities.map(item =>
    typeof item === 'string' ? new Test({ objectId: item }) : item,
  );
  // 测试实体对应的关联关系也需要被删除
  const testRelations = getAllTestRelations({ from: testEntities, to: testEntities });

  return Promise.all([
    Parse.Object.destroyAll(testEntities),
    Parse.Object.destroyAll(testRelations),
  ]);
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

  return Parse.Object.saveAll(newTestEntities);
};

/**
 * 获取测试实体
 */
export const getTestEntityByItemId = (itemId: string | string[]) => {
  const query = new Parse.Query(Test).include(['reference.workspace', 'reference.itemType']);
  if (Array.isArray(itemId)) {
    return query.containedIn('reference', itemId).find();
  }
  return query.equalTo('reference', Item.createWithoutData(itemId)).first();
};

/**
 * 获取测试管理配置
 */
export const getTestConfig = (workspaceKey: string): Promise<Parse.Object> => {
  return new Parse.Query(TestConfig).equalTo('workspaceKey', workspaceKey).first();
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

export const updateTestConfig = () => {
  // TODO
};

/**
 * 获取空间模板已经配置过的 itemTypes（界面方案中使用的 itemType）
 */
export const getUsefulItemTypes = (workspaceId: string) => {
  return new Parse.Query(Workspace)
    .includes(['workspaceTemplate'])
    .equalTo('workspace', workspaceId);
};
