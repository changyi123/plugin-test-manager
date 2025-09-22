import { requestCoreApi } from '@giteeteam/apps-team-api';

import {
  TestConfigClassName,
  TestFiledKeyMapping,
  TestLinkType,
  TestType,
} from '../../../common/constant';
import { initProcessBar } from '../../../trigger/lib/helper';
import { iqlRequest } from '../../../trigger/lib/iqlRequest';
import { testEntityFieldTypeValidator } from '../../../trigger/lib/validator';
import { overwriteIqlParamsWithSelect } from '../api/query';
import { createTestRuns, updateItemsV2 } from '../job';
import { getOrCreateParseObject } from './initialScript';

export const generateSortIndex = (index = 0) => {
  return Math.floor(Date.now() / 1000) * 10e5 + index * 1000;
};

const queryLinkedTestEntity = async props => {
  const { limit, query, offset, select, linkQuery, selector, ascending, descending, fields } =
    props;

  const sourceIds = toArray(linkQuery.sourceIds);
  // 请求参数校验
  testEntityFieldTypeValidator({
    linkType: linkQuery.linkType,
    type: linkQuery.destinationType,
    linkItems: sourceIds,
  });

  return iqlRequest({
    query,
    fields,
    selector,
    ascending,
    descending,
    pagination: { limit, offset },
    linkQuery,
    ...overwriteIqlParamsWithSelect(select),
  });
};

export const handleAfterCreate = async () => {
  const parseContext = global?.parseContext || globalThis?.parseContext;
  const item = global?.item;
  const isClone = parseContext?.isClone;
  const cloneOrigin = parseContext?.cloneOrigin;
  const progressBarKey = parseContext?.progressBarKey;
  console.info('test-manager-item-created-copy-parseContext-1', global?.parseContext);
  console.info('test-manager-item-created-copy-parseContext-2', globalThis?.parseContext);
  console.info('test-manager-item-created-copy-isClone', isClone);
  console.info('test-manager-item-created-copy-cloneOrigin', cloneOrigin);
  console.info('test-manager-item-created-copy-progressBarKey', progressBarKey);
  console.info('test-manager-item-created-copy-parseContext', parseContext);

  // 测试管理全局配置
  const globalTestConfig = await getOrCreateParseObject(false, TestConfigClassName, {
    global: true,
  });
  const globalTestConfigData = globalTestConfig.get('extra') || {};
  const enableCloneItemWithPlanCase = globalTestConfigData?.enableCloneItemWithPlanCase;
  console.info(
    'test-manager-item-created-copy-enableCloneItemWithPlanCase',
    enableCloneItemWithPlanCase,
  );
  console.info('test-manager-item-created-copy-cloneOrigin', JSON.stringify(cloneOrigin));

  if (
    enableCloneItemWithPlanCase &&
    isClone &&
    cloneOrigin?.values?.r_test_manager_type === TestType.Plan
  ) {
    const res = await handleCopyTestCase(cloneOrigin, item?.objectId, progressBarKey);
    console.info('test-manager-item-created-copy-res-复制测试计划下的测试用例', res);
    // 调用封装的复制测试用例函数
    await handleCopyTestExecution(cloneOrigin, item);
  }
};

const toArray = data => (Array.isArray(data) ? data : [data]);

/**
 * 复制测试用例到新事项
 * @param {Object} cloneOrigin 克隆源对象
 * @param {string} targetItemId 目标事项ID
 * @returns {Promise} 复制操作的结果
 */
export const handleCopyTestCase = async (cloneOrigin, targetItemId, progressBarKey) => {
  // 查询原事项测试用例
  const {
    data: { list: testCaseData },
  } = await queryLinkedTestEntity({
    linkQuery: {
      linkType: TestLinkType.CaseLinkPlan,
      sourceIds: cloneOrigin?.objectId || cloneOrigin?.id,
      destinationType: TestType.Case,
    },
    select: ['id'],
    offset: 0,
    limit: 9999,
  });
  console.info('test-manager-item-created-copy-testCaseData-测试计划下的测试用例', testCaseData);

  const caseIds = testCaseData?.map((data: any) => data.id);

  const copyTestCaseParams = {
    items: caseIds,
    fields: {
      values: {
        r_test_manager_linkType: TestLinkType.CaseLinkPlan,
      },
    },
    key: '',
    update: {
      r_test_manager_linkItems: {
        concat: [targetItemId],
      },
      r_test_manager_testPlans: {
        concat: [targetItemId],
      },
    },
  };
  // 对新复制的事项添加上原事项的测试用例
  const data = await updateItemsV2(copyTestCaseParams);
  const message = JSON.stringify(data?.data);
  if (progressBarKey) {
    await initProcessBar(progressBarKey, message);
  }
  console.info('test-manager-item-created-copy-data-对新复制的事项添加上原事项的测试用例', data);
  return data;
};

// 复制测试计划下的测试任务，并且关联其测试任务下的测试用例
const handleCopyTestExecution = async (cloneOrigin, item) => {
  const workspaceKey = item?.workspace?.key;
  const workspaceId = item?.workspace?.objectId || item?.workspace?.id;
  // 找出测试计划下的测试任务
  const {
    data: { list: testExecutionData },
  } = await queryLinkedTestEntity({
    linkQuery: {
      linkType: TestLinkType.ExecutionLinkPlan,
      sourceIds: cloneOrigin?.objectId || cloneOrigin?.id,
      destinationType: TestType.Execution,
    },
    select: ['id', 'name'],
    offset: 0,
    limit: 9999,
    query: { workspaceKey },
  });
  console.info(
    'test-manager-item-created-copy-testExecutionData',
    JSON.stringify(testExecutionData),
  );
  // 复制测试任务
  const cloneTestExecutionPromises = testExecutionData.map((testExecution: any) =>
    requestCoreApi('POST', '/parse/api/items/clone', {
      objectId: testExecution.id || testExecution.objectId,
      workspace: workspaceId,
      name: `'副本' ${testExecution.name}`,
      includeStatus: false,
      includeDescendant: false,
      progressCacheKey: null,
      notIncludeValuesFields: [
        TestFiledKeyMapping.linkItems,
        TestFiledKeyMapping.sortIndex,
        TestFiledKeyMapping.testPlans,
      ],
    }),
  );
  const cloneTestExecutionList: any = await Promise.all(cloneTestExecutionPromises);
  console.info('test-manager-item-created-copy-cloneTestExecutionList', cloneTestExecutionList);
  const filterNullToUpdateTestEntityList = cloneTestExecutionList.filter(list => list !== null);
  const toUpdateTestEntityList = filterNullToUpdateTestEntityList.map((list: any) => {
    return {
      objectId: list.objectId || list.id,
      type: TestType.Execution,
      linkType: TestLinkType.ExecutionLinkPlan,
      linkItems: {
        action: 'add',
        value: [item?.objectId],
      },
      sortIndex: generateSortIndex(),
    };
  });
  console.info(
    'test-manager-item-created-copy-toUpdateTestEntityList',
    JSON.stringify(toUpdateTestEntityList),
  );

  // 新复制出的测试任务，与新的测试计划做关联
  const updateTestEntity = await requestCoreApi(
    'POST',
    `/api/app/${global.applicationId}/${global.appKey}/webhooks/api-batch-update`,
    {
      data: toUpdateTestEntityList,
    },
    headers,
  );
  console.info('test-manager-item-created-copy-updateTestEntity', JSON.stringify(updateTestEntity));
  for (const [index, testExecutionItem] of testExecutionData.entries()) {
    console.info('test-manager-item-created-copy-testExecutionItem', testExecutionItem);
    // 找出测试任务下的测试用例
    const runTestResult: any = await requestCoreApi(
      'POST',
      `/api/app/${global.applicationId}/${global.appKey}/webhooks/api-query-linked-test-entity`,
      {
        descending: [],
        onlySelectId: false,
        query: { workspaceKey },
        limit: 50000,
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: (testExecutionItem as any)?.id || testExecutionItem?.objectId,
        destinationType: TestType.Run,
        select: ['id', 'referenceCase'],
        selector: null,
        sessionToken: global?.sessionToken,
      },
      headers,
    );
    console.info('test-manager-item-created-copy-runTestResult', JSON.stringify(runTestResult));
    const testRunResult = runTestResult?.data?.list;
    console.info('test-manager-item-created-copy-testRunResult', JSON.stringify(testRunResult));
    const runCaseIds = testRunResult?.map((item: any) => item?.referenceCase);
    console.info(
      'test-manager-item-created-copy-tocreatetestrunsparams',
      JSON.stringify({
        caseIds: runCaseIds,
        execution: cloneTestExecutionList[index],
        planId: item?.objectId,
        workspace: cloneTestExecutionList[index].workspace,
      }),
    );
    // 测试用例关联新复制出来的测试任务
    const copyCaseTaskResult = await createTestRuns({
      caseIds: runCaseIds,
      execution: cloneTestExecutionList[index],
      planId: item?.objectId,
      workspace: cloneTestExecutionList[index].workspace,
    });
    console.info(
      'test-manager-item-created-copy-copyCaseTaskResult',
      JSON.stringify(copyCaseTaskResult),
    );
  }
};
