import fetch from '@/lib/utils/fetch';
import { getPluginWebTriggerBaseUrl } from '@/lib/utils/helper';

import { AddTestExecuteToTestPlanPayload } from '../../../common/types/api';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

/** 发送消息通知 */
export const addTestExecutionToTestPlan = async (payload: AddTestExecuteToTestPlanPayload) => {
  return fetch.$post(
    `${pluginWebTriggerBaseUrl}/api-batch-link-test-execution-to-test-plan`,
    payload,
  );
};
