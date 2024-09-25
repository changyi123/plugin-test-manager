import { getParseQuery, requestCoreApi } from '@giteeteam/apps-team-api';

import type { SendMessagePayload } from '../../../common/types/api';
import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';
import { sendMessage as sendMessageApi } from '../../lib/coreApi';

const ReportStatusNameMapping = {
  pass: '通过',
  noPass: '未通过',
  partPass: '部分通过',
};

const ReportColorMapping = {
  pass: '#09b866',
  noPass: '#ff4d0d',
  partPass: '#ffaa0c',
  InProgress: '#09b866',
  Start: '#ff4d0d',
  Finished: '#ffaa0c',
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
        name: testReportData?.name,
        status: ReportStatusNameMapping[testReportData?.reportStatus],
        statusColor: ReportColorMapping[testReportData?.reportStatus],
        version: '',
      };

      const [versionQuery] = await Promise.all([getParseQuery(false, 'Version')]);

      if (versionId) {
        const name = await versionQuery
          .equalTo('objectId', versionId)
          .select(['name'])
          .find({ sessionToken })
          .then(i => i?.[0]?.get('name'));

        info.version = `【${name}】版本`;
      }

      const title = `${info.version ?? info.name}测试报告（${info.status}）`;
      const reportUrl = `${global.env?.PROXIMA_PAGE_BASE_URL ?? ''}/${
        global.applicationId
      }/plugin/test_manager_test-report-view?testReportId=${payload.testReportId}`;

      return {
        internal: {
          title,
          content: `您收到了一份测试报告：${title} [${reportUrl}]，请打开测试报告链接进行查阅。`,
        },
        email: {
          title,
          content: `
          <p>测试报告名称：<strong>${info.name}</strong></p>
          ${info.version ? `<p>测试版本：<strong>${info.version}</strong></p>` : ''}
          <p />
          <p>测试结论：<strong style={{color: ${info.statusColor}}}>${info.status}</strong></p>
          <p>测试报告链接：<a href=${reportUrl}>${reportUrl}</a></p>`,
        },
      };
    },
  },
  testReportV2: {
    payloadValidator: async (payload: SendMessagePayload['templatePayload']) => {
      // 参数校验，不合规直接抛错
      if (!payload) throw new Error('参数不能为空');
      if (!payload.testReportId) throw new Error('报告 ID 不能为空');
      // 查询报告的详情

      const testReportData = await requestCoreApi('POST', '/parse/api/search', {
        iql: `id = '${payload.testReportId}'`,
        isShowDetails: true,
        displayContext: 'test_manager',
      })
        .then((data: any) => data?.payload.items?.[0] ?? null)
        .catch(e => {
          console.info('search fail: ', e.message);
        });

      if (!testReportData) throw new Error('报告不存在');

      return testReportData;
    },
    messagePayloadBuilder: async (
      payload: SendMessagePayload['templatePayload'],
      { validatorResult: testReportData },
    ) => {
      // hard core
      const version = testReportData?.values?.version;

      const info = {
        name: testReportData?.name,
        status: testReportData?.status?.name,
        statusColor: ReportColorMapping[testReportData?.status?.type],
        version: version?.name ? `【${version.name}】版本` : '',
      };

      const title = `${info.version || info.name}测试报告（${info.status}）`;
      const reportUrl = `${global.env?.PROXIMA_PAGE_BASE_URL ?? ''}/${
        global.applicationId
      }/plugin/test_manager_test-report-view?testReportId=${payload.testReportId}&isV2=true`;

      return {
        internal: {
          title,
          content: `您收到了一份测试报告：${title} [${reportUrl}]，请打开测试报告链接进行查阅。`,
        },
        email: {
          title,
          content: `
          <p>测试报告名称：<strong>${info.name}</strong></p>
          ${info.version ? `<p>测试版本：<strong>${info.version}</strong></p>` : ''}
          <p />
          <p>测试结论：<strong style={{color: ${info.statusColor}}}>${info.status}</strong></p>
          <p>测试报告链接：<a href=${reportUrl}>${reportUrl}</a></p>`,
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
      payload: {
        inputParameters: {
          ...payload,
          postType: [type],
          roles: body.roles,
          users: body.users,
          creatUser: body.creatUser,
        },
      },
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
