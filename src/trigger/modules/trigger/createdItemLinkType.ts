import { getParseQuery } from '@giteeteam/apps-team-api';
import findKey from 'lodash/findKey';
import isEqual from 'lodash/isEqual';

import { TestConfigClassName, TestType } from '../../../common/constant';
import { buildResponse } from '../../lib/apiUtil';
import { batchUpdateItems, batchUpdateItemsValues } from '../../lib/batchRequest';
import { buildTestEntityLinkData } from '../../lib/helper';
import { testEntityFieldTypeValidator } from '../../lib/validator';

const generateSortIndex = (index = 0) => {
  return Math.floor(Date.now() / 1000) * 10e5 + index * 1000;
};

// 判断是否是测试实体
const isTestEntity = testType => Object.values(TestType).includes(testType);

export const createdItemLinkType = async () => {
  const { item, itemContext, eventExtraData } = global as any;
  const ParseBaseQueryOptions = {
    sessionToken: global.sessionToken,
  };
  if (!item) return;

  const objectId = item.objectId;
  const testType = item.values?.r_test_manager_type;

  if (itemContext) {
    console.info('itemContext ----------------->', JSON.stringify(itemContext));
  }
  if (eventExtraData) {
    console.info('eventExtraData ----------------->', JSON.stringify(eventExtraData));
  }

  try {
    let needUpdateItemValues;
    if (!item.values.r_test_manager_type) {
      console.info('createdItemLinkType ----------------->', JSON.stringify(item));

      let workspaceKey = item.workspace?.key;
      // 空间 key 不存在重新查询
      if (!workspaceKey) {
        const workspaceId = item.workspace.objectId ?? item.workspace.id;
        console.info('createdItemLinkType-workspaceId ----------------->', workspaceId);
        const workspaceQuery = await getParseQuery(false, 'Workspace');
        workspaceKey = await workspaceQuery
          .equalTo('objectId', workspaceId)
          .select(['key'])
          .first(ParseBaseQueryOptions)
          .then(item => item.get('key'));
      }
      console.info('createdItemLinkType-workspaceKey ----------------->', workspaceKey);

      let itemType = item.itemType?.key;
      if (!itemType) {
        const itemTypeId = item.itemType?.objectId ?? item.itemType?.id;
        console.info('createdItemLinkType-itemTypeId ----------------->', itemTypeId);
        const itemTypeQuery = await getParseQuery(false, 'ItemType');
        itemType = await itemTypeQuery
          .equalTo('objectId', itemTypeId)
          .select(['key'])
          .first(ParseBaseQueryOptions)
          .then(item => item.get('key'));
      }
      console.info('createdItemLinkType-itemType ----------------->', itemType);
      console.info('createdItemLinkType-testType ----------------->', testType, objectId);

      // 查询当前空间的测试管理配置
      const testConfigQuery = await getParseQuery(false, TestConfigClassName);

      const itemTypeMap = await testConfigQuery
        .equalTo('workspaceKey', workspaceKey)
        .select(['itemTypeMap'])
        .first(ParseBaseQueryOptions)
        .then(item => item.get('itemTypeMap'));
      console.info('createdItemLinkType-itemTypeMap ------------->', JSON.stringify(itemTypeMap));

      if (!isTestEntity(testType)) {
        // 不存在测试实体需要判断是否需要新建
        needUpdateItemValues = { objectId } as any;
        if (itemTypeMap) {
          const testEntityType = findKey(itemTypeMap, val => isEqual(val, itemType));
          if (!testEntityType) {
            // 创建失败，未找到映射类型
            return buildResponse('no testConfig itemTypeMap');
          }

          needUpdateItemValues.type = testEntityType;
          // 默认创建时生成排序 sortIndex
          needUpdateItemValues.sortIndex = generateSortIndex(1);
          console.info('createdItemLinkType-type ------------->', needUpdateItemValues.type);
          console.info(
            'createdItemLinkType-sortIndex ------------->',
            needUpdateItemValues.sortIndex,
          );
        }
      }
    }

    if (needUpdateItemValues) {
      await batchUpdateItemsValues([needUpdateItemValues]);
    }

    // 如果是不是从事项单页创建的，走一下更新逻辑
    if (itemContext?.test_manager?.autoCreateTestCase) {
      const _data = itemContext.test_manager;
      if (_data) {
        const data = [
          {
            objectId: item.objectId,
            type: 'TestCase',
            repository: _data.repository,
            detail: {
              precondition: _data.precondition,
              steps: _data.steps,
            },
            sortIndex: generateSortIndex(1),
          },
        ];

        try {
          // 需要更新的事项
          const needUpdateItemData = await buildTestEntityLinkData(data as any); // 校验需要保存的参数
          needUpdateItemData.forEach(testEntityFieldTypeValidator);
          await batchUpdateItems(needUpdateItemData);
        } catch (e) {
          console.info('validate error: skipTestCaseCreate');
        }
      }
    } else {
      console.info('skipTestCaseCreate');
    }

    if (needUpdateItemValues) {
      return buildResponse('created success');
    }

    return buildResponse('have test entity');
  } catch (error) {
    return buildResponse(error);
  }
};
