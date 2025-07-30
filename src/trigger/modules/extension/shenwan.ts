import { axios, getParseQuery } from '@giteeteam/apps-team-api';
import CryptoJS from 'crypto-js';

const RequestTimeout = 15000;

import { buildResponse, getReqInfoFromVMRuntime } from '../../lib/apiUtil';

const XSeaInfo = global.env?.SHENWAN_XSEA_INFO ?? {};
const PerfMaInfo = global.env?.SHENWAN_PERFMA_INFO ?? {};
const CoverRate = global.env?.SHENWAN_COVERTAYE_INFO ?? {};

const PlatformInfo = {
  /** XSea 平台 */
  XSea: {
    BaseUrl: XSeaInfo?.BaseUrl ?? 'http://192.168.136.104:8081',
    AccessKeySecret: XSeaInfo?.AccessKeySecret ?? '009cb503cbd54584a031494ef492b7b6',
    AccessKeyId: XSeaInfo?.AccessKeyId ?? '95d0a7da081949d8b592d34f9c826390',
    AccountName: XSeaInfo?.AccountName ?? 'baidu',
  },
  /** 笨马平台 */
  PerfMa: {
    BaseUrl: PerfMaInfo?.BaseUrl ?? 'http://192.168.136.90:8088',
    AccessKeySecret: PerfMaInfo?.AccessKeySecret ?? '2692ff7d2aff4f55b930cc59dbc9efe9',
    AccessKeyId: PerfMaInfo?.AccessKeyId ?? 'a155224294f64734bf33aecc88e194ae',
    AccountName: PerfMaInfo?.AccountName ?? 'baidu',
  },
  /** 覆盖率平台 */
  CoverRate: {
    BaseUrl: CoverRate?.BaseUrl ?? 'http://192.168.178.116:8080',
    AccessKeySecret: CoverRate?.AccessKeySecret ?? '2692ff7d2aff4f55b930cc59dbc9efe9',
    AccessKeyId: CoverRate?.AccessKeyId ?? 'a155224294f64734bf33aecc88e194ae',
    AccountName: CoverRate?.AccountName ?? 'baidu',
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
  try {
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

    console.info('XSea res ------------->', authInfo.headers, requestInfo.body, res);

    return res.object;
  } catch {
    return '无';
  }
};

/** 请求 PerfMa 平台 */
const requestPerfMaPlan = async name => {
  try {
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

    console.info('PerfMa res ------------->', authInfo.headers, requestInfo.body, res);
    return res.object?.reportUrl ?? '';
  } catch {
    return '无';
  }
};

/** 覆盖率平台coverRate */
const requestCoverRate = async (versionName) => {
  try {
    const requestInfo = {
      path:  `/openapi/getCovInfoByVersion?versionName=${versionName}`,
      method: 'get',
    } as const;

    const authInfo = getAuthInfo('CoverRate', requestInfo);
    const res = await axios({
      timeout: RequestTimeout,
      url: PlatformInfo.CoverRate.BaseUrl + requestInfo.path,
      method: requestInfo.method,
      headers: {
        ...authInfo.headers,
      },
    });
    console.info('CoverRate res ------------->', res);
    return res;
  } catch {
    return '无';
  }
};

/** 申万测试报告信息，对接申万笨马，XSea 平台接口, 覆盖率平台coverRate */
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
    const [xSeaReportPageUrl, perfMaReportPageUrl, coverRateReportPageUrl] = await Promise.all([
      requestXSeaPlan(versionName),
      requestPerfMaPlan(versionName),
      requestCoverRate(versionName),
    ]);

    return buildResponse({
      xSea: xSeaReportPageUrl,
      perfMa: perfMaReportPageUrl,
      coverRate: coverRateReportPageUrl,
    });
  } catch (err) {
    console.info('err--------------------------------', err);
    return buildResponse({
      xSea: '无',
      perfMa: '无',
      coverRate: '无',
    });
  }
};
