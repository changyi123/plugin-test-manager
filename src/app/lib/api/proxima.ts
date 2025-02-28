/**
 * proxima api 只为获取数据，返回数据为 JSON。不要在插件内修改 proxima 内的数据模型 ！！
 */
import { IBatchCreateParams, IBatchUpdateParams } from 'common/types/api';
import { itemToTestEntity } from 'common/utils/dataTransfer';
import { findKey, pick } from 'lodash';

import {
  BuiltinItemTypeMapping,
  FIELD_TYPE_KEY_MAPPINGS,
  InfinityLimit,
  SYSTEM_FIELD,
  TEST_MANAGER_PLUGIN_KEY,
} from '@/lib/constants';
import { BuiltinFieldNameMapping, TestFiledKeyMapping } from '@/lib/constants';
import Parse from '@/lib/parse';
import fetch from '@/lib/utils/fetch';
import { hasArrayItem } from '@/lib/utils/helper';
import { IQLBuilder } from '@/lib/utils/iql';
import {
  AppsWorkspace,
  CustomField,
  Item,
  ItemType,
  ItemTypeScheme,
  ReportTemplate,
  Workspace,
} from '@/services/models';

import { getRefItemIdsByTestIds, transferObject } from './common';

type IQLPaginationParams = {
  offset?: number;
  limit?: number;
};

/**
 * 通过事项 id 获取 事项
 */
export const getItemByIQL = async (
  params: IQLPaginationParams & {
    // like
    nameLike?: string;
    nameOrKeyLike?: string;
    itemId?: string | string[];
    // 需要排除的事项 id
    excludeItemId?: string[];
    itemKey?: string | string[];
    itemType?: string | string[];
    workspace?: string | string[];
    orderBy?: string[];
    r_test_manager_type?: string | string[];
    r_test_manager_repository?: string | string[];
  },
) => {
  const {
    workspace,
    itemId,
    excludeItemId,
    nameLike,
    nameOrKeyLike,
    itemKey,
    itemType,
    orderBy,
    ...pagination
  } = params;

  const iql = new IQLBuilder();

  Array.isArray(workspace)
    ? iql.whereIn('workspaceKey', workspace)
    : iql.where('workspaceKey', workspace);

  Array.isArray(itemType)
    ? iql.whereIn('itemTypeKey', itemType)
    : iql.where('itemTypeKey', itemType);

  Array.isArray(excludeItemId) && iql.whereNot('id', excludeItemId);
  Array.isArray(itemId) ? iql.whereIn('id', itemId) : iql.where('id', itemId);
  Array.isArray(itemKey) ? iql.whereIn('key', itemKey) : iql.where('key', itemKey);

  if (nameLike && typeof nameLike === 'string') {
    iql.whereLike('标题', nameLike);
  }

  if (nameOrKeyLike && typeof nameOrKeyLike === 'string') {
    iql.or(
      new IQLBuilder().whereLike('标题', nameOrKeyLike),
      new IQLBuilder().whereLike('key', nameOrKeyLike),
    );
  }

  // 传入测试管理类型
  const TestFiledValues = Object.values(TestFiledKeyMapping);
  const testFields = Object.keys(params).reduce((res, key) => {
    if (TestFiledValues.includes(key as any)) {
      return [...res, key];
    }
    return res;
  }, []);
  if (testFields?.length) {
    testFields.forEach(field => {
      // 找回定义的key
      const key = findKey(TestFiledKeyMapping, o => o === field);
      // 查询值
      const values = params[field];
      // 查询条件名称
      const searchName = BuiltinFieldNameMapping[key];
      // 拼接查询条件
      Array.isArray(values) ? iql.whereIn(searchName, values) : iql.where(searchName, values);
    });
  }

  // TODO: orderby没有兼容字段
  if (hasArrayItem(orderBy)) {
    iql.orderBy(orderBy[0] || '修改时间', (orderBy[1] as any) || 'desc');
  }

  const {
    data: { payload },
  } = await fetch.post('/parse/api/search', {
    iql: iql.toString(),
    from: pagination.offset ?? 0,
    size: pagination.limit ?? 0,
    displayContext: TEST_MANAGER_PLUGIN_KEY,
  });
  // 转换成测试管理的格式
  if (payload?.items) {
    payload.items = payload.items.map(item => transferObject(itemToTestEntity(item)));
  }
  return payload;
};

/**
 * 获取全部自定义字段
 */
export const getCustomFields = async (keys = [] as string[]) => {
  const query = new Parse.Query(CustomField)
    .containedIn('key', keys)
    .include('fieldType')
    .limit(9999);

  const fields = await query.find();
  return fields
    .map(item => item.toJSON())
    .filter(field => {
      // 下列字段类型组件不支持渲染
      const isNotAllowRenderFieldType = [
        FIELD_TYPE_KEY_MAPPINGS.File,
        FIELD_TYPE_KEY_MAPPINGS.Annex,
        FIELD_TYPE_KEY_MAPPINGS.Editor,
        FIELD_TYPE_KEY_MAPPINGS.Link,
        FIELD_TYPE_KEY_MAPPINGS.ItemLevel,
        FIELD_TYPE_KEY_MAPPINGS.FieldCollection,
      ].includes(field?.fieldType?.key);

      // 以下字段不支持渲染
      const isNotAllowRenderFieldKey = [
        SYSTEM_FIELD.Name,
        // SYSTEM_FIELD.Status,
        SYSTEM_FIELD.SecurityLevel,
      ].includes(field.key);

      return !isNotAllowRenderFieldKey && !isNotAllowRenderFieldType;
    });
};

/**
 * 通过 workspaceKey 查询 workspace（不要问为什么又这个方法，proxima 处处会给你人来惊喜）
 */
export const getWorkspaceByKey = async key => {
  if (!key) return;
  return new Parse.Query(Workspace).equalTo('key', key).first({ json: true });
};

/**
 * 通过 workspaceId 查询 workspace
 */
export const getWorkspaceById = async id => {
  if (!id) return;
  const workspace = await new Parse.Query(Workspace).equalTo('objectId', id).first();
  return workspace?.toJSON();
};

/**
 * 通过 itemKey 获取 itemType （不要问为什么又这个方法，proxima 处处会给你人来惊喜）
 */
export const getItemTypeByKey = async key => {
  if (!key) return;
  const itemType = await new Parse.Query(ItemType).equalTo('key', key).first({
    context: {
      displayModule: 'plugin.testManager',
    },
  });
  return itemType?.toJSON();
};

/**
 *
 * 批量获取类型，通过key
 *
 */
export const getItemTypeByKeys = async keys => {
  if (!keys.length) return;
  const itemTypeList = await new Parse.Query(ItemType).containedIn('key', keys).find({
    json: true,
    context: {
      displayModule: 'plugin.testManager',
    },
  });
  return keys.map(key => itemTypeList.find(itemType => itemType.key === key)).filter(Boolean);
};

/**
 * 通过 itemKey 获取 itemType （不要问为什么又这个方法，proxima 处处会给你人来惊喜）
 */
export const getItemTypeById = async id => {
  if (!id) return;
  const itemType = await new Parse.Query(ItemType).equalTo('objectId', id).first({
    context: {
      displayModule: 'plugin.testManager',
    },
  });
  return itemType?.toJSON();
};

/** 获取层级视图顶级类型 */
export const getTopItemTypeFromHierarchy = async workspaceId => {
  const itemTypeScheme = await new Parse.Query(Workspace)
    .include('itemTypeScheme')
    .equalTo('objectId', workspaceId)
    .first();
  if (!itemTypeScheme) return;

  const hierarchy = JSON.parse(itemTypeScheme.toJSON().itemTypeScheme.hierarchy);
  return hierarchy;
};

/** 获取所有的类型 */
export const getAllItemTypes = async (showHiddenItemType = false) => {
  return new Parse.Query(ItemType).limit(9999).find({
    json: true,
    context: {
      displayModule: showHiddenItemType ? 'plugin.testManager' : '',
    },
  });
};

/** 获取内置类型 */
export const getBuiltinItemTypes = async () => {
  // 内置类型的 key
  const builtinItemTypeKeys = Object.values(BuiltinItemTypeMapping);
  const itemTypes = await new Parse.Query(ItemType)
    .containedIn('key', builtinItemTypeKeys)
    .limit(9999)
    .find({
      context: {
        displayModule: 'plugin.testManager',
      },
    });
  const itemTypesData = itemTypes.map(item => item.toJSON());
  return itemTypesData.filter(itemType => builtinItemTypeKeys.includes(itemType.key));
};

/** 获取所有的事项， iql 无 itemType icon 字段，使用此方法获取 */
export const getItemByIds = async (itemIds: string[]) => {
  const res = await new Parse.Query(Item)
    .containedIn('objectId', itemIds)
    .select('itemType', 'workspace', 'name', 'key', 'status')
    .include(['itemType', 'workspace', 'status'])
    .findAll({ 'X-Proxima-API-Token': 'a:d36e77a9a6f5cb1b9d37c6cc' });

  return res.map(item => item.toJSON());
};

/** 删除所有事项 */
export const deleteItems = async (itemIds: string[] | string) => {
  if (!Array.isArray(itemIds)) itemIds = [itemIds];
  itemIds = itemIds.filter(Boolean);
  return Parse.Cloud.run('deleteItems', {
    itemIds,
  });

  // const paramsData = itemIds.filter(Boolean).map(id => ({
  //   objectId: id,
  // }));
  // return fetch.$delete('/parse/api/items/bulk', { data: paramsData });
};

export const updateItemAssignee = async (testIds, assignee) => {
  if (!Array.isArray(testIds)) testIds = [testIds];
  // 获取 itemId
  const itemIds = await getRefItemIdsByTestIds(testIds);

  const items = await new Parse.Query(Item)
    .containedIn('objectId', itemIds.filter(Boolean))
    .findAll();

  const needUpdatedItems = items.map(item =>
    item.set({
      values: {
        ...item.get('values'),
        assignee,
      },
    }),
  );

  return Parse.Object.saveAll(needUpdatedItems);
};

/** FIXME: 克隆事项 */
export const cloneItem = async (
  itemData: {
    objectId: string;
    workspaceKey: string;
    name: string;
  }[],
) => {
  const result = await fetch.$post('/parse/api/items/clone', {
    ...itemData,
    includeStatus: false,
  });

  return result.data?.objectId;
};

export const batchCreateItems = async (params: IBatchCreateParams) => {
  const result = await fetch.$post('/parse/api/v2/items/batch/create', params);

  return result.data;
};

export const batchUpdateItems = async (params: IBatchUpdateParams) => {
  const result = await fetch.$post('/parse/api/v2/items/batch/update', params);

  return result.data;
};

// 获取插件关联的工作空间
export const getPluginBoundWorkspaces = async () => {
  const appWorkspace = await new Parse.Query(AppsWorkspace)
    .equalTo('appKey', TEST_MANAGER_PLUGIN_KEY)
    .include('workspaces')
    .first({ json: true });

  const global = appWorkspace ? appWorkspace.global : true;
  let boundWorkspaces = [];

  if (global) {
    boundWorkspaces = await new Parse.Query(Workspace).limit(9999).find({ json: true });
  } else {
    const appWorkspaceKeys = appWorkspace.workspaces.map(item => item?.key ?? item).filter(Boolean);

    boundWorkspaces = await new Parse.Query(Workspace)
      .containedIn('key', appWorkspaceKeys)
      .limit(appWorkspaceKeys.length)
      .find({ json: true });
  }
  return boundWorkspaces;
};

/** 更新被测试管理插件关联的事项层级方案 */
export const updateUsedHierarchySchema = async () => {
  const builtinItemTypes = await getBuiltinItemTypes();

  const workspaces = await getPluginBoundWorkspaces();

  const itemTypeSchemeIds = workspaces.map(item => item.itemTypeScheme?.objectId).filter(Boolean);

  const itemTypeSchemes = await new Parse.Query(ItemTypeScheme)
    .containedIn('objectId', itemTypeSchemeIds)
    .findAll()
    .then(list => list.map(item => item.toJSON()));
  const needUpdatedParseObjects = itemTypeSchemes.reduce((res, itemTypeScheme) => {
    const hierarchy = JSON.parse(itemTypeScheme.hierarchy ?? '[]');
    // 事项层级方案中不存在的类型
    const notExistedBuiltinItemTypesInHierarchy = builtinItemTypes.filter(
      itemType => !hierarchy.some(item => itemType.key === item.key),
    );

    if (notExistedBuiltinItemTypesInHierarchy.length) {
      const itemTypeSchemeParseObj = Parse.Object.fromJSON({
        ...itemTypeScheme,
        className: 'ItemTypeScheme',
      });
      const pickUsefulFields = itemType => pick(itemType, ['objectId', 'icon', 'name', 'key']);
      itemTypeSchemeParseObj.set({
        hierarchy: JSON.stringify(
          notExistedBuiltinItemTypesInHierarchy.map(pickUsefulFields).concat(hierarchy),
        ),
      });
      return res.concat(itemTypeSchemeParseObj);
    }
    return res;
  }, []);

  await Parse.Object.saveAll(needUpdatedParseObjects);
};

/** 获取空间下成员 */
export const getWorkspaceRoleMembers = async (params: {
  workspaceId: string;
  keyword?: string;
}) => {
  const result = await fetch.$get(`/parse/api/workspaceRoles/${params.workspaceId}/members`, {
    params: { keyword: params.keyword ?? '' },
  });

  return result;
};

// 获取空间列表
export const getWorkspaces = async (params: {
  pageIndex: number;
  pageSize?: number;
  keyword?: string;
}) => {
  const result = await fetch.$get(`/parse/api/workspaces`, {
    params: {
      keyword: params.keyword ?? '',
      showCollected: false,
      pageIndex: params.pageIndex,
      pageSize: params.pageSize || 10,
    },
  });

  return result;
};

/** 获取空间下某类型的状态列表 */
export const getStatusByWorkspaceAndItemType = async (params: {
  workspaceId: string;
  itemTypeKey: string;
  keyword?: string;
}) => {
  const itemType = await getItemTypeByKey(params.itemTypeKey);
  const result = await fetch
    .$post(`/parse/api/workflows/search`, [
      {
        workspace: { objectId: params.workspaceId },
        itemType,
      },
    ])
    .then(data => {
      const linkedStartNodeId = data?.[0]?.transitions?.find(t => t.source?.key === 'start_node')
        ?.target?.key;
      return data?.[0]?.nodes
        ?.filter(
          node => node?.name?.includes(params?.keyword?.trim() ?? '') && node.id !== 'start_node',
        )
        ?.map(node => {
          if (node.statusId === linkedStartNodeId) {
            node.isStartStatus = true;
          }
          return node;
        });
    });

  return result ?? [];
};

/** 测试报告导出 */
export const exportReport = async (params: {
  chartGroupId: string;
  templateId: string;
  name?: string;
  slotData: Record<string, unknown>;
  parallelSize: number;
}) => {
  let templateId = params.templateId;
  if (!templateId) {
    const template = await new Parse.Query(ReportTemplate).addDescending('updatedAt').first();
    templateId = template.id;
  }
  return await fetch.$post(`/parse/api/generateReport/generate`, {
    templateId,
    ...params,
  });
};

export const searchFields = async (params: {
  keys: string[];
  propertyNames: string[];
  fieldType?: boolean;
}) => {
  return await fetch
    .$get('/parse/api/fields/search', {
      params,
    })
    .then(result => result.payload);
};

export const search = async (iql, fields = [], size = InfinityLimit) => {
  try {
    const {
      data: { payload },
    } = await fetch.post('/parse/api/search', {
      size,
      iql: iql,
      fields,
      isShowDetails: true,
      displayContext: 'test_manager',
    });
    return payload?.items ?? [];
  } catch (e) {
    console.info('search fail: ', e.message);
    return [];
  }
};
