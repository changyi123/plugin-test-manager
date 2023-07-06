import fetch from '@/lib/utils/fetch';
import { getPluginWebTriggerBaseUrl } from '@/lib/utils/helper';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

/** 发送消息通知 */
export const sendMessage = async () => {
  return fetch.$post(`${pluginWebTriggerBaseUrl}/api-send-message`, {});
};
