import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';
import { uniq } from 'lodash';

import {
  InfinityLimit,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import { batchUpdateItemsValues } from '../../lib/batchRequest';
import { dataFetcher } from '../../lib/initialization';
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

// 审批事项关联，批量扭转用例状态
export const itemAfterSaveForApproval = async () => {
  const { item, originalItem, env } = global as any;
  const globalConfig = await dataFetcher.getGlobalTestConfig();
  const approvalConfig = globalConfig.extra?.approvalConfig;

  console.log(
    'itemAfterSaveForApproval approvalConfig',
    globalConfig,
    approvalConfig,
    item,
    JSON.stringify(item),
  );

  const workspaceTestConfig = await getParseQuery(true, 'TestConfig')
    .equalTo('workspaceKey', item.workspace?.key)
    .select(['itemTypeMap'])
    .first({ useMasterKey: true })
    .then(o => o.toJSON());
  console.log('itemAfterSaveForApproval itemTypeMap', workspaceTestConfig);

  if (!approvalConfig || !workspaceTestConfig?.itemTypeMap?.TestApproval) {
    return;
  }
  const approvalItemTypeKey =
    workspaceTestConfig?.itemTypeMap?.TestApproval || env.APPROVAL_ITEM_TYPE_KEY;
  const itemTargatStatusId =
    approvalConfig.itemApprovalStatus || env.APPROVAL_ITEM_TARGET_STATUS_ID;
  console.info('itemAfterSaveForApproval', item, JSON.stringify(item));
  console.info('itemAfterSaveForApproval env', env);

  //事项类型key
  const itemTypeKey = item.itemType.key;
  //状态id
  const statusId = item.status.objectId;

  // 不符合目标类型直接结束
  if (itemTypeKey !== approvalItemTypeKey) {
    return;
  }

  if (originalItem.status.objectId === item.status.objectId) {
    console.info('事项[' + item.name + ']状态未发生变化');
    return;
  }

  console.info('事项[' + item.name + ']变化后状态是:' + item.status.objectId);
  console.info('statusId', statusId, 'itemTargatStatusId', itemTargatStatusId);
  // 状态发生变更 且符合目标状态 才触发以下逻辑
  if (statusId !== itemTargatStatusId) {
    return;
  }

  // 查询关联的测试用例
  const {
    data: { list: cases = [] },
  } = await iqlRequest({
    fields: ['id', 'name', 'status', 'r_test_manager_type'],
    pagination: { limit: InfinityLimit },
    selector: `测试评审 = '${item.objectId}' and test_manager_type = '${TestType.Case}'`,
  });

  console.info('itemAfterSaveForApproval request done', JSON.stringify(cases));

  const firstCase = cases?.[0];

  if (!firstCase) {
    return;
  }

  const itemWorkflowRes = await requestCoreApi(
    'GET',
    `/parse/api/workflows/item/${firstCase.objectId}`,
  );

  console.info(
    'itemWorkflowRes',
    itemWorkflowRes,
    (itemWorkflowRes as any)?.transitions,
    JSON.stringify(itemWorkflowRes),
  );

  const caseTargatStatusId = approvalConfig.caseApprovalStatus || env.CASE_TARGAT_STATUS_ID;
  console.log('caseTargatStatusId', caseTargatStatusId);

  const caseTargetStatus = await getParseQuery(false, 'Status')
    .select(['name'])
    .equalTo('objectId', caseTargatStatusId)
    .first({ useMasterKey: true })
    .then(status => status.toJSON());
  console.log('caseTargatStatusIdName', caseTargetStatus);

  // const caseTargetStatusName = caseTargetStatus.name || env.CASE_TARGET_STATUS_NAME;

  const targetTransitions = ((itemWorkflowRes as any).transitions || []).filter(
    item => item.targetId === caseTargatStatusId,
  );

  console.info('targetTransitions', targetTransitions);

  // 遍历可到达用例目标状态的源状态
  const sourceStatusIdMap = {};
  targetTransitions.forEach(item => {
    sourceStatusIdMap[item.sourceId] = item;
  });

  console.info('sourceStatusIdMap', sourceStatusIdMap);

  // 用例状态分组
  const caseStatutIdMap = {};
  cases.forEach(item => {
    if (!caseStatutIdMap[(item as any).workflowStatus?.objectId]) {
      caseStatutIdMap[(item as any).workflowStatus?.objectId] = [];
    }
    caseStatutIdMap[(item as any).workflowStatus?.objectId].push(item.objectId);
  });

  console.info('caseStatutIdMap', caseStatutIdMap);

  // 批量扭转
  const allStatusIds = Object.keys(sourceStatusIdMap);
  for (const statusId of allStatusIds) {
    if (!caseStatutIdMap[statusId]?.length) {
      continue;
    }
    console.info('触发扭转，目前状态:' + statusId, '关联用例:', caseStatutIdMap[statusId]);
    try {
      const execRes = await requestCoreApi(
        'POST',
        '/parse/api/v2/items/batch/transition',
        {
          transition: sourceStatusIdMap[statusId].name,
          currentState: statusId,
          items: caseStatutIdMap[statusId],
        },
        {
          'X-Parse-Session-Token': env.AUTOMATION_TOKEN || 'a:5342414fbd5b66363156fb08',
        },
      );
      console.info('扭转完成, 执行结果:', execRes);
    } catch (error) {
      console.error('扭转失败, 执行结果:', error, JSON.stringify(error));
    }
  }
  // console.info('涉及用例：', caseStatutIdMap, JSON.stringify(caseStatutIdMap));
};
