import fetch from '@/lib/utils/fetch';
import { getPluginWebTriggerBaseUrl, getSessionToken } from '@/lib/utils/helper';

import {
  AddExecuteToPlanProcessParams,
  CopyFolderPayloadProcessParams,
  RemoveCaseFromPlanProcessParams,
  RemoveExecuteFromPlanProcessParams,
} from '../../../common/types/api';
import { RetryPayloadProcessParams } from './../../../common/types/api';
const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

/** 发送消息通知 */
export const addTestExecutionToTestPlan = async (payload: AddExecuteToPlanProcessParams) => {
  return fetch.$post(`${pluginWebTriggerBaseUrl}/api-add-execution-to-plan`, payload);
};

export const removeTestCaseFromTestPlan = async (payload: RemoveCaseFromPlanProcessParams) => {
  return fetch.$post(`${pluginWebTriggerBaseUrl}/api-remove-case-from-plan`, payload);
};

export const removeTestExecutionFromTestPlan = async (
  payload: RemoveExecuteFromPlanProcessParams,
) => {
  return fetch.$post(`${pluginWebTriggerBaseUrl}/api-remove-execution-from-plan`, payload);
};

export const retryBatchAction = async (payload: RetryPayloadProcessParams) => {
  return fetch.$post(`${pluginWebTriggerBaseUrl}/api-retry`, {
    ...payload,
    sessionToken: getSessionToken(),
  });
};

export const copyFolder = async (payload: CopyFolderPayloadProcessParams) => {
  return fetch.$post(`${pluginWebTriggerBaseUrl}/api-copy-folder`, {
    ...payload,
    sessionToken: getSessionToken(),
  });
};
