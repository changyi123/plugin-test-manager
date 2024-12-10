import { getItem, getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';
import findKey from 'lodash/findKey';
import isEqual from 'lodash/isEqual';

import { TestConfigClassName, TestType } from '../../../common/constant';
import { buildResponse } from '../../lib/apiUtil';
import { batchUpdateItemsValues } from '../../lib/batchRequest';

const generateSortIndex = (index = 0) => {
  return Math.floor(Date.now() / 1000) * 10e5 + index * 1000;
};

// 判断是否是测试实体
const isTestEntity = testType => Object.values(TestType).includes(testType);

export const createdItemLinkType = async () => {
  const { item } = global as any;
  const ParseBaseQueryOptions = {
    sessionToken: global.sessionToken,
  };
  if (!item) return;

  const objectId = item.objectId;
  const testType = item.values?.r_test_manager_type;

  try {
    if (item.values.r_test_manager_type) {
      const caseId = item.values.r_test_manager_referenceCase;
      // 若创建的是测试执行,需要为对应的测试用例添加测试计划
      if (testType === TestType.Run && caseId) {
        // 获取对应用例的测试计划
        const targetCase = (await getItem(caseId, true)) as any;
        const originalLinkItems = targetCase.r_test_manager_linkItems || [];
        if (!originalLinkItems.includes(item.values.r_test_manager_plan)) {
          // 更新对应的用例
          await requestCoreApi('PUT', `/parse/api/v2/items/${caseId}`, {
            values: {
              __screen_type: 'view',
              r_test_manager_linkType: 'CaseLinkPlan',
              r_test_manager_linkItems: [...originalLinkItems, item.values.r_test_manager_plan],
            },
            parseContext: {
              skipFieldBehaviorValidation: true,
              skipItemValidationLevel: true,
              skipCheckWhetherArchived: true,
              skipItemValidation: true,
              skipFormValidation: true,
              skipFormulaCalculation: true,
              skipSnapshotValidate: true,
              skipValidateSecurityLevel: true,
              skipRelationUser: true,
              skipHandleApps: true,
              skipItemLink: true,
              skipPermission: true,
            },
          });
        }
      }
    } else {
      console.info('createdItemLinkType ----------------->', JSON.stringify(item));

      let workspaceKey = item.workspace?.key;
      // 空间 key 不存在重新查询
      if (!workspaceKey) {
        const workspaceId = item.workspace.objectId ?? item.workspace.id;
        console.info('createdItemLinkType-workspaceId ----------------->', workspaceId);
        const workspaceQuery = await getParseQuery(false, 'Workspace');
        workspaceKey = await workspaceQuery
          .equalTo('objectId', workspaceId)
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
          .first(ParseBaseQueryOptions)
          .then(item => item.get('key'));
      }
      console.info('createdItemLinkType-itemType ----------------->', itemType);
      console.info('createdItemLinkType-testType ----------------->', testType, objectId);

      // 查询当前空间的测试管理配置
      const testConfigQuery = await getParseQuery(false, TestConfigClassName);

      const itemTypeMap = await testConfigQuery
        .equalTo('workspaceKey', workspaceKey)
        .first(ParseBaseQueryOptions)
        .then(item => item.get('itemTypeMap'));
      console.info('createdItemLinkType-itemTypeMap ------------->', JSON.stringify(itemTypeMap));

      if (!isTestEntity(testType)) {
        // 不存在测试实体需要判断是否需要新建
        const needUpdateItemValues = { objectId } as any;
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

          await batchUpdateItemsValues([needUpdateItemValues]);
        }
        return buildResponse('created success');
      }
    }
    return buildResponse('have test entity');
  } catch (error) {
    return buildResponse(error);
  }
};
