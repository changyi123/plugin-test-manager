import { uniq } from 'lodash';

import {
  InfinityLimit,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import { batchUpdateItemsValues } from '../../lib/batchRequest';
import { iqlRequest } from '../../lib/iqlRequest';

function getLinkItem(i) {
  if (!Array.isArray(i.values.r_test_manager_linkItems)) return null;
  return i.values.r_test_manager_linkItems[0] || null;
}

// 测试执行保存后，更新测试任务/用例关联的测试计划
export const itemAfterSave = async () => {
  const { item, originalItem } = global as any;
  if (item.values.r_test_manager_type !== TestType.Execution) return;
  // 判断测试计划是否改变
  if (getLinkItem(originalItem) === getLinkItem(item)) return;
  const planId = getLinkItem(item);
  // 查询关联的测试执行，更新
  const {
    data: { list: runs },
  } = await iqlRequest({
    query: {
      type: TestType.Run,
    },
    linkQuery: {
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: [item.objectId],
      destinationType: TestType.Run,
    },
    fields: [TestFiledKeyMapping.referenceCase],
    pagination: { limit: InfinityLimit },
  });
  // 查询关联的测试用例，更新
  const {
    data: { list: cases },
  } = await iqlRequest({
    query: {
      id: runs.map(i => i.values[TestFiledKeyMapping.referenceCase]).filter(Boolean),
    },
    pagination: { limit: InfinityLimit },
  });
  // 批量更新存量数据
  await batchUpdateItemsValues([
    ...runs.map(i => ({ objectId: i.objectId, plan: planId })),
    ...cases.map(i => ({
      objectId: i.objectId,
      linkItems: uniq([...i.values.r_test_manager_linkItems, planId]),
      testPlans: uniq([...i.values.r_test_manager_linkItems, planId]),
    })),
  ]);
};
