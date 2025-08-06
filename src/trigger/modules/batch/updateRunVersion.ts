/**@file 批量更新测试执行版本 */

import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';

import { CASE_IS_UPDATE, TestFiledKeyMapping } from '../../../common/constant';
import { BatchUpdateTestRunVersionPayload, UpdateRunItem } from '../../../common/types/api';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { batchUpdateItemsValues } from '../../lib/batchRequest';
import { CASESNAPSHOT_TYPE } from '../../lib/constants';
const TEST_MANAGER_PLUGIN_KEY = 'test_manager';
// 获取快照配置
const getCaseSnapshotInfo = async key => {
  if (!global.env?.ENABLED_CASE_SNAPSHOT) {
    return { type: CASESNAPSHOT_TYPE.NO_AUTOBUILDVERSION_NO_SELVERSION };
  }
  try {
    const result = await getParseQuery(false, 'test_manager_TestConfig')
      .equalTo('workspaceKey', key)
      .select(['caseSnapshot'])
      .first({ useMasterKey: true, json: true });
    console.info('getCaseSnapshotType', result);
    return result.caseSnapshot;
  } catch (error) {
    console.error('getCaseSnapshotType error:', error);
    // 返回默认配置而不是抛出错误
    return { type: CASESNAPSHOT_TYPE.NO_AUTOBUILDVERSION_NO_SELVERSION };
  }
};

const canUpdateCaseVersion = caseSnapshot => {
  return (
    CASESNAPSHOT_TYPE.NO_BUILDVERSION_SELVERSION === caseSnapshot?.type &&
    caseSnapshot?.enableCaseExeUpdate
  );
};

export const batchUpdateRunVersion = async () => {
  const validateParams = body => {
    const workspaceKey = body.workspaceKey;
    const runVersions = body.runVersions;
    if (!Array.isArray(runVersions)) {
      throw new Error('runVersions must be an array');
    } else if (runVersions?.length === 0) {
      throw new Error('runVersions must not be empty');
    } else if (!workspaceKey) {
      throw new Error('workspaceKey must not be empty');
    }
  };

  /**
   *  1. 将测试执行任务和测试计划进行关联
   *  2. 将计划下存在的测试执行对应的用例关联至测试计划中
   *  3. 更新测试执行的执行状态至计划关联用例的 casaStatus 中
   */
  try {
    const { body: requestPayload } = getReqInfoFromVMRuntime<BatchUpdateTestRunVersionPayload>();

    const workspaceKey = requestPayload.workspaceKey;
    const runVersions = requestPayload.runVersions;
    validateParams(requestPayload);

    const validateRuns = async () => {
      const snapShotType = await getCaseSnapshotInfo(workspaceKey);
      const updateRunIds = runVersions.map(item => item.runId);

      console.info('snapShotType: ', snapShotType);
      if (!canUpdateCaseVersion(snapShotType)) {
        throw new Error('The version of the use case cannot be modified.');
      }

      if (!snapShotType.restrictiveConditions) {
        return true;
      }

      let iql = `'test_manager_linkType' = "RunLinkExecution" and 'test_manager_type' = "TestRun" and 'id' in [${updateRunIds
        .map(id => `'${id}'`)
        .join(',')}]`;

      iql += ` and ${snapShotType.restrictiveConditions}`;
      const updateRunDetails = await requestCoreApi('POST', '/parse/api/search', {
        iql,
        fields: ['id'],
        size: 9999,
        displayContext: TEST_MANAGER_PLUGIN_KEY,
      }).then((data: any) => data?.payload.items ?? null);

      if (updateRunDetails.length !== updateRunIds.length) {
        throw new Error('The test execution version cannot be modified.');
      }
    };

    const getAllRunLinkCase = async () => {
      const iql = `'test_manager_type' = "TestCase" and 'id' in [${runVersions
        .map(item => `'${item.caseId}'`)
        .join(',')}]`;

      const allCaseDetails = await requestCoreApi('POST', '/parse/api/search', {
        iql,
        size: 9999,
        displayContext: TEST_MANAGER_PLUGIN_KEY,
      }).then((data: any) => data?.payload.items ?? []);

      const caseIdMapDetail = allCaseDetails.reduce((acc, cur) => {
        acc[cur.id] = cur;
        return acc;
      }, {});

      return caseIdMapDetail;
    };

    const buildBatchUpdateParam = caseIdToDetailMap => {
      return runVersions.map(item => {
        const newestCaseDetail = caseIdToDetailMap[item.caseId];
        return {
          objectId: item.runId,
          runDetail: JSON.parse(newestCaseDetail.values?.[TestFiledKeyMapping.detail] || '{}'),
          referenceCaseSnapshot: '',
          baseLineItemVersion: '',
          isCaseUpdate: CASE_IS_UPDATE.NO,
        };
      });
    };

    await validateRuns();
    const caseIdToDetailMap = await getAllRunLinkCase();
    console.info('batchUpdateRunVersion caseIdToDetailMap: ', caseIdToDetailMap);
    await batchUpdateItemsValues(buildBatchUpdateParam(caseIdToDetailMap), true, true);

    return buildResponse('success');
  } catch (err) {
    return buildResponse(err);
  }
};

/**
 * @description 单个更新版本 参数设计： 用例id, 版本id, 执行id
 * */
export const updateRunVersion = async () => {
  const { body: requestPayload } = getReqInfoFromVMRuntime<UpdateRunItem>();
  const { runId, baseLineItemId, caseId, workspaceKey } = requestPayload;
  const validateParams = () => {
    if (!runId || !caseId) {
      throw new Error('runId and caseId must not be empty');
    } else if (!workspaceKey) {
      throw new Error('workspaceKey must not be empty');
    }
  };

  try {
    const validate = async () => {
      const snapShotType = await getCaseSnapshotInfo(workspaceKey);

      if (!canUpdateCaseVersion(snapShotType)) {
        throw new Error('The version of the use case cannot be modified.');
      }

      let iql = `'test_manager_linkType' = "RunLinkExecution" and 'test_manager_type' = "TestRun" and 'id' in ['${runId}']`;

      if (!snapShotType.restrictiveConditions) {
        return true;
      }

      iql += ` and ${snapShotType.restrictiveConditions}`;

      const canUpdateRuns = await requestCoreApi('POST', '/parse/api/search', {
        iql,
        fields: ['id'],
        size: 9999,
        displayContext: TEST_MANAGER_PLUGIN_KEY,
      }).then((data: any) => data?.payload.items ?? null);

      if (canUpdateRuns.length !== 1) {
        throw new Error('The change use case version condition or constraint is not met');
      }
    };

    const updateRun = async () => {
      let iql = `id in ['${baseLineItemId || caseId}']`;
      if (baseLineItemId) {
        iql += " and baseLineSources in ['BaseLineItemVersion'] order by createdAt desc";
      }

      const caseDetailInfo = await requestCoreApi('POST', '/parse/api/search', {
        iql,
        size: 1,
        displayContext: TEST_MANAGER_PLUGIN_KEY,
      }).then((data: any) => data?.payload.items?.[0] ?? null);

      console.info('caseDetailInfo: ', caseDetailInfo);
      if (!caseDetailInfo) {
        throw new Error('The use case does not exist');
      }
      const updatedRuns = [];

      const updateItem = {
        objectId: runId,
        runDetail: JSON.parse(caseDetailInfo.values?.[TestFiledKeyMapping.detail] || '{}'),
        referenceCaseSnapshot: '',
        baseLineItemVersion: '',
        isCaseUpdate: CASE_IS_UPDATE.YES,
      };

      if (baseLineItemId) {
        delete updateItem.isCaseUpdate;
        updateItem.referenceCaseSnapshot = caseDetailInfo.id;
        updateItem.baseLineItemVersion = {
          ...caseDetailInfo.values?.[TestFiledKeyMapping.baseLineItemVersion],
          baseLineItemId: caseDetailInfo.objectId,
        };
      }
      updatedRuns.push(updateItem);
      console.info('updatedRuns: ', updatedRuns);
      await batchUpdateItemsValues(updatedRuns, true, true);
    };

    validateParams();
    await validate();
    await updateRun();

    return buildResponse('success');
  } catch (err) {
    return buildResponse(err);
  }
};
