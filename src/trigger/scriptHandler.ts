import * as apis from '@giteeteam/apps-team-api';

import { getReqInfoFromVMRuntime } from './lib/apiUtil';

export const runScript = async (): Promise<any> => {
  const {
    body: { params, script },
  } = getReqInfoFromVMRuntime<{ params: unknown; script: string }>();

  const paramsKeys = Object.keys(params);

  const mainScript = `
    return (async function main() {
      const res = await (async () => {
        const {${paramsKeys}} = params;
        ${script}
      })();
      return res;
    })();
  `;

  try {
    const run = new Function('apis', 'params', mainScript);
    return await run(apis, params);
  } catch (e) {
    console.error(e);
    throw e;
  }
};
