import { getAppEnv } from '../appEnv';
import fetch from './fetch';

export const getExecutionDefaultConfig = async plan => {
  const defaultNameConfig = getAppEnv('CREATE_EXECUTION_DEFAULT_NAME_CONFIG');
  const enable = defaultNameConfig?.enable;
  const suffixName = defaultNameConfig?.suffixName;

  if (!enable) {
    return {};
  }

  if (!plan?.key) {
    return { name: suffixName };
  }

  try {
    const {
      data: { payload },
    } = await fetch.post('/parse/api/search', {
      iql: `item in  hierarchicalQuery('${plan?.key}', 1, 0)`,
      includeHiddenItem: true,
      size: 1,
      fields: ['id', 'name'],
    });

    const parentItem = payload?.items?.[0];
    const config = { name: `${parentItem ? parentItem.name : plan.name}_${suffixName}` };

    return config;
  } catch (err) {
    console.error(err);
    return { name: `${plan.name}_${suffixName}` };
  }
};
