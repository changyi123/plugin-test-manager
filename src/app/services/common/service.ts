import fetch from '@/lib/utils/fetch';
import { getPluginWebTriggerBaseUrl } from '@/lib/utils/helper';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

/** 发送消息通知 */
export const sendMessage = async (params: {
  useTemplate: 'testReport' | 'testReportV2';
  templatePayload: Record<string, any>;
  postType: ('internal' | 'email')[];
  users: string[];
  groups: string[];
  creatUser?: string;
}) => {
  return fetch.$post(`${pluginWebTriggerBaseUrl}/api-send-message`, params);
};
