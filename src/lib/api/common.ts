import Parse from '@/lib/parse';
import { keyBy, merge } from 'lodash';
import { TestConfig } from '../models';
import { getItemByIQL } from './proxima';
import { hasArrayItem } from '@/lib/utils/helper';
import { TestType, TestRelationType } from '@/lib/constants';
import { Workspace, Item, Test, TestRelation } from '@/lib/models';

type PointerType = string | Parse.Object;

/** 转换 pointer */
const pointerTransfer = (parseModel, pointer: PointerType) => {
  return typeof pointer === 'string' ? parseModel.createWithoutData(pointer) : pointer;
};

/** to/from -> pointer */
const testRelationTypePointerTransfer = arr =>
  hasArrayItem(arr) ? arr.map(item => pointerTransfer(TestRelation, item)) : [];

/**
 * 根据关联类型查询测试实体（分页，批量查询，填充 proxima 事项数据）
 */
export const getTestEntitiesByRelation = async (
  relType: TestRelationType,
  sides: Partial<Record<'from' | 'to', Array<PointerType> | PointerType>> = {},
  _config?: any,
) => {
  const config = merge(
    {
      // 返回数据数据格式是 json
      toJSON: true,
      // 需要填充 item 数据则自动转换未 json 格式
      fillItemData: false,
      queryParams: { limit: 10, offset: 0, orderBy: 'createdAt' },
    },
    _config,
  );
  // 查询必须要要有关联类型
  if (!relType) return;
  const include = [];
  const query = new Parse.Query(TestRelation).equalTo('relationType', relType);

  Object.entries(sides).forEach(([sideKey, side]) => {
    // 支持数组的关联关系查询
    if (Array.isArray(side)) {
      query.containedIn(sideKey, testRelationTypePointerTransfer(side));
    } else {
      query.equalTo(sideKey, pointerTransfer(TestRelationType, side as PointerType));
    }
    // 查另一向的关联关系
    const sideMapping = {
      from: 'to',
      to: 'from',
    };
    include.push(sideMapping[sideKey]);
  });

  // 需要获取关联事项的实体
  query.include(include);
  query.withCount(true);

  if (config?.queryParams && typeof config?.queryParams === 'object') {
    const queryParams = config.queryParams;
    query.limit(queryParams.limit);
    query.skip(queryParams.offset);
    query.ascending(queryParams.orderBy);
  }

  const { results, count } = await query.find();

  // from or to 则查批量数据，from and to 查一条数据
  const getTestEntityByRelation = relation =>
    include.length === 1 ? relation?.[include[0]] ?? relation?.get(include[0]) : relation;

  // 生成标准数据
  const buildReturnData = list => ({
    list,
    count,
  });

  // 需要填充 item 数据则自动转换未 json 格式，非批量数据不做处理
  if (config?.toJSON && Array.isArray(results) && include.length === 1) {
    const itemIds = [];
    const testEntitiesData = results.map(relation => {
      const relationData = relation.toJSON();
      const testEntityData = getTestEntityByRelation(relationData);
      itemIds.push(testEntityData.reference?.objectId);
      return {
        ...testEntityData,
        // 当前关联数据
        relation: relationData,
        testRelationId: relationData.objectId,
      };
    });
    if (!config?.fillItemData) return buildReturnData(testEntitiesData);

    // 从 iql 中获取 item 相关数据
    const { items } = await getItemByIQL({ itemId: itemIds, limit: config?.queryParams?.limit });
    const itemMap = keyBy(items, 'objectId');
    const testEntitiesDataWithItemData = testEntitiesData.map(entity => {
      const item = itemMap[entity.reference?.objectId];
      // 测试运行没有关联的事项
      return Object.assign({}, entity, { reference: item || null });
    });
    return buildReturnData(testEntitiesDataWithItemData);
  }

  return {
    count,
    list: results.map(getTestEntityByRelation),
  };
};

/**
 * 根据测试实体查询测试实体关联
 */
export const getTestRelation = ({
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
  const testRelations = getTestRelation({ from: testEntities, to: testEntities });

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
