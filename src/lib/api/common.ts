import Parse from '@/lib/parse';
import { TestConfig } from '../models';
import { Workspace, Item, Test, TestRelation } from '@/lib/models';
import { TestType, TestRelationType } from '@/lib/constants';
import { pick } from 'lodash';

/**
 * 根据关联类型查询测试实体
 */
export const getTestEntitiesByRelation = (
  relType: TestRelationType,
  sides: Partial<Record<'from' | 'to', string | Parse.Object>> = {},
) => {
  const pointerTransfer = (pointer: string | Parse.Object) => {
    return typeof pointer === 'string' ? TestRelation.createWithoutData(pointer) : pointer;
  };
  // 查询必须要要有关联类型
  if (!relType) return;
  const include = [];
  const query = new Parse.Query(TestRelation).equalTo('relationType', relType);

  Object.entries(sides).forEach(([sideKey, side]) => {
    query.equalTo(sideKey, pointerTransfer(side));
    // 查另一向的关联关系
    const sideMapping = {
      from: 'to',
      to: 'from',
    };
    include.push(sideMapping[sideKey]);
  });

  return query.include(include).map(res => {
    const testEntities = pick(res, include);
    if (include.length === 1) return testEntities[include[0]];
    return testEntities;
  });
};

/**
 * 创建测试实体关联关系
 */
export const createTestRelation = ({
  from,
  to,
  relationType,
}: {
  from: string | Parse.Object;
  to: string | Parse.Object;
  relationType: TestRelationType;
}) => {
  const pointerTransfer = (pointer: string | Parse.Object) => {
    return typeof pointer === 'string' ? TestRelation.createWithoutData(pointer) : pointer;
  };

  const relationField = {
    from: pointerTransfer(from),
    to: pointerTransfer(to),
    relationType: relationType,
  };

  const newRelation = new TestRelation();

  // TODO: 是否需要先查询？
  return newRelation.save(relationField);
};

/**
 * 创建测试实体
 */
export const createTestEntity = (newEntity: {
  itemId: string;
  type: TestType;
  workspaceId: string;
}) => {
  const newTest = new Test({
    type: newEntity.type,
    workspace: Workspace.createWithoutData(newEntity.workspaceId),
    reference: Item.createWithoutData(newEntity.itemId),
  });

  return newTest.save();
};

/**
 * 获取测试实体
 */
export const getTestEntity = (itemId: string) => {
  return new Parse.Query(Test).equalTo('reference', itemId);
};

/**
 * 获取测试管理配置
 */
export const getTestConfig = (workspaceId: string) => {
  return new Parse.Query(TestConfig).equalTo('workspace', workspaceId).first();
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
