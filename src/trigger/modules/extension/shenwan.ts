import { axios, getParseQuery } from '@giteeteam/apps-team-api';
import CryptoJS from 'crypto-js';

const RequestTimeout = 15000;

import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';

const PlatformInfo = {
  /** XSea 平台 */
  XSea: {
    BaseUrl: 'http://192.168.136.104:8081',
    AccessKeySecret: '009cb503cbd54584a031494ef492b7b6',
    AccessKeyId: '95d0a7da081949d8b592d34f9c826390',
    AccountName: 'baidu',
  },
  /** 笨马平台 */
  PerfMa: {
    BaseUrl: 'http://192.168.136.56:8088',
    AccessKeySecret: '3d0c3b01ec4942e28f5c70af6e73b865',
    AccessKeyId: 'c6dc17c7d9ce420ebbb8ec90783eccb2',
    AccountName: 'baidu',
  },
} as const;

const getAuthInfo = (
  authKey: keyof typeof PlatformInfo,
  { body = '' as any, method = 'POST', path = '' },
) => {
  const { AccessKeyId, AccessKeySecret, AccountName } = PlatformInfo[authKey];

  const timestamp = new Date().getTime();
  const md5 = CryptoJS.MD5(body).toString(CryptoJS.enc.Base64);
  const string = [method, md5, timestamp, path].join('\n');
  const sign = CryptoJS.HmacSHA256(string, AccessKeySecret);

  const signature = AccessKeyId + ':' + sign.toString(CryptoJS.enc.Base64) + ':' + AccountName;

  return {
    headers: {
      'Content-MD5': md5,
      Timestamp: timestamp,
      Authorization: signature,
    },
  };
};

/** 请求 XSea 平台测试 */
const requestXSeaPlan = async name => {
  const requestInfo = {
    path: '/api/xsea/open/scene/getLastReportByPlan',
    body: {
      planName: name,
    },
    method: 'POST',
  } as const;

  const authInfo = getAuthInfo('XSea', requestInfo);

  const res = await axios({
    timeout: RequestTimeout,
    url: PlatformInfo.XSea.BaseUrl + requestInfo.path,
    method: requestInfo.method,
    data: requestInfo.body,
    headers: {
      ...authInfo.headers,
    },
  });

  console.info('XSea res ------------->', res);

  return res.object;
};

/** 请求 PerfMa 平台 */
const requestPerfMaPlan = async name => {
  const requestInfo = {
    path: '/api/tocean/open/v4/report/getUptodateReport',
    body: {
      name,
    },
    method: 'POST',
  } as const;

  const authInfo = getAuthInfo('PerfMa', requestInfo);

  const res = await axios({
    timeout: RequestTimeout,
    url: PlatformInfo.PerfMa.BaseUrl + requestInfo.path,
    method: requestInfo.method,
    data: requestInfo.body,
    headers: {
      ...authInfo.headers,
    },
  });

  console.info('PerfMa res ------------->', res);

  return res.object;
};

/** 申万测试报告信息，对接申万笨马，XSea 平台接口 */
export const shenwanTestReportInfo = async () => {
  const { body, sessionToken } = getReqInfoFromVMRuntime<{
    versionName: string;
    reportId: string;
    reportOverviewData: Record<string, any>;
  }>();

  let versionName = body.versionName ?? '';

  if (Array.isArray(body?.reportOverviewData?.version) && body.reportOverviewData.version.length) {
    const versionId = body.reportOverviewData.version[0];
    versionName = await getParseQuery(false, 'Version')
      .equalTo('objectId', versionId)
      .select(['name'])
      .find({ sessionToken })
      .then(objects => objects?.map(i => i.get('name'))?.[0]);

    console.info('versionName-------->', versionName);
  }

  try {
    const [xSeaReportPageUrl, perfMaReportPageUrl] = await Promise.all([
      requestXSeaPlan(versionName),
      requestPerfMaPlan(versionName),
    ]);

    return buildResponse({
      xSea: xSeaReportPageUrl,
      perfMa: perfMaReportPageUrl,
    });
  } catch (err) {
    console.info('err--------------------------------', err);
    return buildResponse({
      xSea: '//www.baidu.com',
      perfMa: '//www.baidu.com',
    });
  }
};
