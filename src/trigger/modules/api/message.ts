import { getParseQuery } from '@giteeteam/apps-team-api';

import type { SendMessagePayload } from '../../../common/types/api';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { sendMessage as sendMessageApi } from '../../lib/coreApi';

const ReportStatusNameMapping = {
  pass: '通过',
  noPass: '失败',
  partPass: '部分通过',
};

// 消息模板
const MessageTemplate = {
  testReport: {
    payloadValidator: async (payload: SendMessagePayload['templatePayload'], { sessionToken }) => {
      // 参数校验，不合规直接抛错
      if (!payload) throw new Error('参数不能为空');
      if (!payload.testReportId) throw new Error('报告 ID 不能为空');
      // 查询报告的详情
      const [testReportQuery] = await Promise.all([
        getParseQuery(false, 'test_manager_TestReport'),
        // getParseQuery(false, 'Version'),
      ]);

      const testReportData = await testReportQuery
        .equalTo('objectId', payload.testReportId)
        .include('workspace')
        .find({
          sessionToken,
        })
        .then(data => data?.[0]?.toJSON());

      if (!testReportData) throw new Error('报告不存在');

      return testReportData;
    },
    messagePayloadBuilder: async (
      payload: SendMessagePayload['templatePayload'],
      { validatorResult: testReportData },
    ) => {
      // hard core
      const versionId = testReportData?.reportOverviewData?.version?.[0];

      const info = {
        status: ReportStatusNameMapping[testReportData?.reportStatus],
        version: '',
      };

      const [versionQuery] = await Promise.all([getParseQuery(false, 'Version')]);

      if (versionId) {
        const name = await versionQuery
          .equalTo('objectId', versionId)
          .select(['name'])
          .find({ sessionToken })
          .then(i => i?.[0]?.get('name'));

        info.version = `${name}版本`;
      }

      const title = `${info.version}测试报告（${info.status}）`;
      const reportUrl = `${global.env?.PROXIMA_PAGE_BASE_URL ?? ''}/${
        global.applicationId
      }/plugin/test_manager_test-report-view?testReportId=${payload.testReportId}`;

      console.info('reportUrl--------->', reportUrl);

      return {
        internal: {
          title,
          content: `您收到了一份测试报告：<a href=${reportUrl}>${title}</a>，请查阅`,
        },
        email: {
          title,
          content: `<p>测试版本：${info.version}</p><p /><p>测试结论：${info.status}</p><p>测试报告链接：<a href=${reportUrl}>${reportUrl}</a></p>`,
        },
      };
    },
  },
};

/** 发送消息通知 */
export const sendMessage = async () => {
  const { body, sessionToken } = getReqInfoFromVMRuntime<SendMessagePayload>();
  const template = MessageTemplate[body.useTemplate];

  if (!template) return buildResponse(new Error('消息模板不存在'));

  let validatorResult = null;

  try {
    // 校验模板参数，并返回校验过程中的数据传入下一阶段
    validatorResult = await template.payloadValidator?.(body.templatePayload, {
      sessionToken,
    });
  } catch (err) {
    return buildResponse(new Error('消息模板参数校验失败：' + err.message));
  }

  const messagePayload = await template.messagePayloadBuilder?.(body.templatePayload, {
    sessionToken,
    validatorResult,
  });

  const postType = body.postType ?? [];

  const runners = postType.map(type => {
    const payload = messagePayload[type];
    return sendMessageApi({
      ...payload,
      postType,
      roles: body.roles,
      users: body.users,
      creatUser: body.creatUser,
    });
  });

  try {
    await Promise.all(runners);
  } catch (err) {
    console.info('error---------------->', err);
    return buildResponse(new Error('消息发送失败：' + err.message));
  }

  return buildResponse(postType.map(type => messagePayload[type]));
};
