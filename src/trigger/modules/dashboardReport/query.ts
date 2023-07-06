import { getParseQuery } from '@giteeteam/apps-team-api';
import { omit } from 'lodash';

import { QueryTestReportPayload } from '../../../common/types/api';
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
    // 查询所有的版本
    const version = await versionQuery
      .equalTo('name', body.versionName)
      .select(['name', 'objectId'])
      .first(parseOptions)
      .then(i => i?.toJSON());

    testReportOverviewDataParams.version = version;
  }

  const hasReportOverDataQuery = !!Object.values(testReportOverviewDataParams).filter(Boolean)
    ?.length;

  // 增加 reportOverviewData 筛选条件
  if (hasReportOverDataQuery) {
    testReportQuery.exists('reportOverviewData');
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
