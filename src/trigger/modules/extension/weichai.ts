import { axios } from '@giteeteam/apps-team-api';

import { buildResponse } from '../../lib/apiUtil';
/** 对文件进行加密 */
export const weichaiFileEncrypt = async () => {
  const encryptSeverURL = global?.env?.FILE_ENCRYPT_SERVER_BASE_URL;
  const base64 = global.body?.base64;

  if (!encryptSeverURL) return buildResponse({ base64 });

  try {
    const { data } = await axios({
      method: 'POST',
      url: `${encryptSeverURL}/rest/v2/encryptBase64`,
      data: {
        baseStr: base64,
      },
    });

    return buildResponse({
      base64: data,
    });
  } catch (error) {
    return buildResponse(error);
  }
};
