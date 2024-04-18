import fetch from '@/lib/utils/fetch';

import { getPluginWebTriggerBaseUrl } from '../utils/helper';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

export const checkDuplicateCases = async data => {
  return fetch.post(`${pluginWebTriggerBaseUrl}/check-duplicate-case`, data);
};
