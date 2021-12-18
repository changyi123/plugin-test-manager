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

/**
 * 根据关联类型查询测试实体
 */
export const getTestEntitiesByRelation = async (
  relType: TestRelationType,
  sides: Partial<Record<'from' | 'to', Array<PointerType> | PointerType>> = {},
  _config?: any,
) => {
  const config = merge(
    {
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
      query.containedIn(
        sideKey,
        side.map(item => pointerTransfer(TestRelationType, item)),
      );
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

  if (config?.queryParams && typeof config?.queryParams === 'object') {
    const queryParams = config.queryParams;
    query.limit(queryParams.limit);
    query.skip(queryParams.offset);
    query.ascending(queryParams.orderBy);
  }

  const data = await query.find();

  const testEntities = data.map(testEntity => {
    if (include.length === 1) return testEntity?.get(include[0]);
    return testEntity;
  });

  // 需要填充 item 数据则自动转换未 json 格式
  if (config?.fillItemData && hasArrayItem(testEntities)) {
    const testEntitiesData = testEntities.map(item => item.toJSON());
    const itemIds = testEntitiesData.map(item => item.reference?.objectId);
    const { items } = await getItemByIQL({ itemId: itemIds, limit: config?.queryParams?.limit });
    const itemObj = keyBy(items, 'objectId');
    return testEntitiesData.map(entity => {
      const item = itemObj[entity.reference?.objectId];
      // 测试运行没有关联的事项
      return Object.assign({}, entity, { reference: item || null });
    });
  }

  return testEntities;
};

/**
 * 根据测试实体查询测试实体关联
 */
export const getTestRelation = ({
  from,
  to,
}: Partial<Record<'from' | 'to', Array<string | Parse.Object>>>) => {
  const testRelationTypePointerTransfer = arr =>
    hasArrayItem(arr) ? arr.map(item => pointerTransfer(TestRelationType, item)) : [];

  return Parse.Query.or(
    new Parse.Query(TestRelation).containedBy('from', testRelationTypePointerTransfer(from)),
    new Parse.Query(TestRelation).containedBy('to', testRelationTypePointerTransfer(to)),
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
  const pointerTransfer = (pointer: string | Parse.Object) => {
    return typeof pointer === 'string' ? TestRelation.createWithoutData(pointer) : pointer;
  };

  const relations = _relations.map(
    rel =>
      new TestRelation({
        to: pointerTransfer(rel.to),
        from: pointerTransfer(rel.from),
        relationType: rel.relationType,
      }),
  );

  return Parse.Object.saveAll(relations);
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
export const getTestEntityByItemId = (itemId: string) => {
  return new Parse.Query(Test)
    .include(['reference.workspace', 'reference.itemType'])
    .equalTo('reference', Item.createWithoutData(itemId))
    .first();
};

/**
 * 获取测试管理配置
 */
export const getTestConfig = (workspaceKey: string): Promise<Parse.Object> => {
  return new Parse.Query(TestConfig).equalTo('workspaceKey', workspaceKey).first();
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
