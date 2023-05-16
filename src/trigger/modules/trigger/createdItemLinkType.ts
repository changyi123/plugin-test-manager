import { getParseQuery } from '@giteeteam/apps-team-api';
import findKey from 'lodash/findKey';
import isEqual from 'lodash/isEqual';

import { TestConfigClassName, TestType } from '../../../common/constant';
import { buildResponse } from '../../lib/apiUtil';
import { batchUpdateItems } from '../../lib/batchRequest';

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
  console.info('createdItemLinkType ----------------->', item);
  const workspaceKey = item.workspace.key;
  const itemType = item.itemType.key;
  const objectId = item.objectId;
  const testType = item.values?.r_test_manager_type;

  try {
    // 查询当前空间的测试管理配置
    const testConfigQuery = await getParseQuery(false, TestConfigClassName);

    const [testConfig] = await testConfigQuery
      .equalTo('workspaceKey', workspaceKey)
      .find(ParseBaseQueryOptions);
    const itemTypeMap = testConfig.get('itemTypeMap') ?? {};

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
        if (testEntityType === TestType.Case) {
          // 测试用例创建时需要生成默认 sortIndex
          needUpdateItemValues.sortIndex = generateSortIndex(1);
        }

        await batchUpdateItems([needUpdateItemValues]);
      }
      return buildResponse('created success');
    }
    return buildResponse('have test entity');
  } catch (error) {
    return buildResponse(error);
  }
};
