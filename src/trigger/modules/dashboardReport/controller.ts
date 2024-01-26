import { axios } from '@giteeteam/apps-team-api';
import { getParseModel, getParseQuery, saveAllObject } from '@giteeteam/apps-team-api';
import { omit } from 'lodash';

import { GenerateTestReportPayload, QueryTestReportPayload } from '../../../common/types/api';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';

/** 查询测试报告 */
export const queryTestReport = async () => {
  const { body, sessionToken } = getReqInfoFromVMRuntime<QueryTestReportPayload>();

  const parseOptions = {
    sessionToken,
  };

  const [testReportQuery, versionQuery] = await Promise.all([
    getParseQuery(false, 'test_manager_TestReport'),
    getParseQuery(false, 'Version'),
  ]);

  const testReportOverviewDataParams = {
    version: null,
  };

  if (body.versionName) {
    const majorVersionNames = Array.from(
      new Set(body.versionName.split(',').map(versionName => versionName.replace(/patch\d+$/, ''))),
    );
    // 查询所有的版本
    const version = await versionQuery
      .containedIn('name', majorVersionNames)
      .select(['name', 'objectId'])
      .first(parseOptions)
      .then(i => i?.toJSON());

    testReportOverviewDataParams.version = version;
  }

  const hasReportOverDataQuery = !!Object.values(testReportOverviewDataParams).filter(Boolean)
    ?.length;

  // 增加 reportOverviewData 筛选条件
  if (hasReportOverDataQuery) {
    (testReportQuery as any).exists('reportOverviewData');
  }

  // 根据查询条件过滤对应的测试
  const testReportDataList = await testReportQuery
    .select(['objectId', 'name', 'reportOverviewData', 'reportStatus'])
    .descending('createdAt')
    .limit(9999)
    .find({ sessionToken })
    .then(res => res?.map(i => i.toJSON()));

  const genReportPageUrl = (testReportId: string) => {
    return `${global.env?.PROXIMA_PAGE_BASE_URL ?? ''}/${
      global.applicationId
    }/plugin/test_manager_test-report-view?testReportId=${testReportId}`;
  };

  const result = testReportDataList
    .filter(reportData => {
      if (testReportOverviewDataParams.version) {
        const versionId = testReportOverviewDataParams.version.objectId;
        const reportVersionIdSet = new Set(reportData.reportOverviewData.version);
        return reportVersionIdSet.has(versionId);
      }
    })
    .map(reportData => {
      console.info('reportUrl--------->', genReportPageUrl(reportData.objectId));

      return {
        ...omit(reportData, ['reportOverviewData']),
        // TODO: 生成测试报告 url
        reportUrl: genReportPageUrl(reportData.objectId),
      };
    });

  return buildResponse(result);
};

/** 生成离线测试报告 */
export const generateOfflineReport = async () => {
  const { body, sessionToken } = getReqInfoFromVMRuntime<GenerateTestReportPayload>();
  const testReportId = body.testReportId;

  const wordExportServerBaseUrl =
    global?.env?.WORD_EXPORT_BASE_SERVER_URL ?? 'http://gitee-proxima-word-export:3001';

  const res = await axios({
    method: 'POST',
    url: `${wordExportServerBaseUrl}/api/word/generator/testReport`,
    data: {
      testReportId,
    },
    headers: {
      'x-parse-application-id': global?.env?.applicationId ?? 'inspur',
      // 'X-proxima-api-token': sessionToken,
    },
  });

  const url = res?.url;

  if (url) {
    const testReportData = await getParseQuery(false, 'test_manager_TestReport')
      .equalTo('objectId', testReportId)
      .first({ sessionToken })
      .then(i => i.toJSON());

    const TestReportModel = getParseModel(false, 'test_manager_TestReport');

    const testReport = new TestReportModel({
      objectId: testReportData.objectId,
      reportUrl: url,
    });

    await saveAllObject([testReport]);
  }

  return buildResponse(url);
};
