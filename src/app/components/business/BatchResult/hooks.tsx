import { Modal } from 'antd';
import {
  AddExecuteToPlanPayload,
  BatchCopyTestCaseV2Payload,
  BatchCopyTestCaseV3Payload,
  BatchCreateTestRunV2Payload,
  BatchDeletePayload,
  BatchDeleteV2Payload,
  CopyFolderPayload,
  IBatchUpdateParams,
  RemoveCaseFromPlanPayload,
  RemoveExecuteFromPlanPayload,
  RetryPayload,
} from 'common/types/api';
import React from 'react';
import { v4 as uuid } from 'uuid';

import BatchResult from '@/components/business/BatchResult';
import {
  batchCreateTestRunV2,
  copyTestCaseV2,
  copyTestCaseV3,
  deleteTestEntity,
  deleteTestEntityV2,
  updateItemsV2,
} from '@/lib/api/item';
import { getRootContainer } from '@/lib/utils/helper';
import {
  addTestExecutionToTestPlan,
  copyFolder,
  removeTestCaseFromTestPlan,
  removeTestExecutionFromTestPlan,
  retryBatchAction,
} from '@/services/testEntity/service';

const { info } = Modal;

export enum ACTION_TYPE_ENUM {
  DELETE_V1,
  DELETE_V2,
  UPDATE_V2,
  CREATE_RUN,
  IMPORT_CASE,
  COPY_CASE,
  REMOVE_CASE_FROM_PLAN,
  REMOVE_EXECUTION_FROM_PLAN,
  ADD_EXECUTION_TO_PLAN,
  RETRY,
  COPY_FOLDER,
}

type ProcessSwap<T> = T & {
  handleSuccess: (desc?: string) => void;
  handleFail?: (error?: Error) => void;
  actionType?: ACTION_TYPE_ENUM;
  title?: string;
  key?: string;
  hideNotification?: boolean;
  zIndex?: number;
};

export async function createTestRunWithProcess(props: ProcessSwap<BatchCreateTestRunV2Payload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.CREATE_RUN });
}

export async function importTestCaseWithProcess(props: ProcessSwap<BatchCopyTestCaseV3Payload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.IMPORT_CASE });
}

export async function copyTestCaseWithProcess(props: ProcessSwap<BatchCopyTestCaseV2Payload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.COPY_CASE });
}

export async function deleteV1WithProcess(props: ProcessSwap<BatchDeletePayload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.DELETE_V1 });
}

export async function deleteV2WithProcess(props: ProcessSwap<BatchDeleteV2Payload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.DELETE_V2 });
}

export async function updateItemsWithProcess(props: ProcessSwap<IBatchUpdateParams>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.UPDATE_V2 });
}

export async function addExecutionToPlanWithProcess(props: ProcessSwap<AddExecuteToPlanPayload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.ADD_EXECUTION_TO_PLAN });
}

export async function removeExecutionFromPlanWithProcess(
  props: ProcessSwap<RemoveExecuteFromPlanPayload>,
) {
  return await execWithProcess({
    ...props,
    actionType: ACTION_TYPE_ENUM.REMOVE_EXECUTION_FROM_PLAN,
  });
}

export async function removeCaseFromPlanWithProcess(props: ProcessSwap<RemoveCaseFromPlanPayload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.REMOVE_CASE_FROM_PLAN });
}

export async function retryWithProcess(props: ProcessSwap<RetryPayload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.RETRY });
}

export async function copyFolderWithProcess(props: ProcessSwap<CopyFolderPayload>) {
  return await execWithProcess({ ...props, actionType: ACTION_TYPE_ENUM.COPY_FOLDER });
}

let timer = null;

export async function execWithProcess(
  props: ProcessSwap<
    | BatchDeleteV2Payload
    | BatchDeletePayload
    | IBatchUpdateParams
    | BatchCreateTestRunV2Payload
    | BatchCopyTestCaseV3Payload
    | BatchCopyTestCaseV2Payload
    | AddExecuteToPlanPayload
    | RemoveExecuteFromPlanPayload
    | RemoveCaseFromPlanPayload
    | RetryPayload
    | CopyFolderPayload
  >,
) {
  const {
    title: propsTitle,
    actionType,
    handleSuccess: originHandleSuccess,
    handleFail,
    hideNotification = false,
    zIndex,
    ...params
  } = props;

  const handleSuccess = async props => {
    let closeModal = true;
    let result = props;
    if (props) {
      try {
        result = JSON.parse(props);
        closeModal = !result?.message?.length;
      } catch (e) {
        console.error(e.message, props);
      }
    }
    if (closeModal) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        Modal.destroyAll();
      }, 1000);
    }
    await originHandleSuccess(result);
  };
  let title = '操作中';

  const processBarKey = uuid();

  try {
    let data;
    switch (actionType) {
      case ACTION_TYPE_ENUM.DELETE_V1:
        data = await deleteTestEntity({
          ...params,
          key: processBarKey,
        });
        title = '移除中';
        break;
      case ACTION_TYPE_ENUM.DELETE_V2:
        data = await deleteTestEntityV2({
          ...params,
          key: processBarKey,
        });
        title = '移除中';
        break;
      case ACTION_TYPE_ENUM.UPDATE_V2:
        data = await updateItemsV2({
          ...(params as IBatchUpdateParams),
          key: processBarKey,
        });
        title = '更新中';
        break;
      case ACTION_TYPE_ENUM.CREATE_RUN:
        data = await batchCreateTestRunV2({
          ...(params as BatchCreateTestRunV2Payload),
          key: processBarKey,
        });
        title = '规划用例中';
        break;

      case ACTION_TYPE_ENUM.IMPORT_CASE:
        data = await copyTestCaseV3({
          ...(params as BatchCopyTestCaseV3Payload),
          key: processBarKey,
        });
        title = '用例导入中';
        break;

      case ACTION_TYPE_ENUM.COPY_CASE:
        data = await copyTestCaseV2({
          ...(params as BatchCopyTestCaseV2Payload),
          key: processBarKey,
        });
        title = '用例复制中';
        break;

      case ACTION_TYPE_ENUM.ADD_EXECUTION_TO_PLAN:
        data = await addTestExecutionToTestPlan({
          ...(params as AddExecuteToPlanPayload),
          key: processBarKey,
        });
        title = '测试执行任务的测试用例处理中';
        break;
      case ACTION_TYPE_ENUM.REMOVE_EXECUTION_FROM_PLAN:
        data = await removeTestExecutionFromTestPlan({
          ...(params as RemoveExecuteFromPlanPayload),
          key: processBarKey,
        });
        title = '测试执行任务的测试用例处理中';
        break;
      case ACTION_TYPE_ENUM.REMOVE_CASE_FROM_PLAN:
        data = await removeTestCaseFromTestPlan({
          ...(params as RemoveCaseFromPlanPayload),
          key: processBarKey,
        });
        title = '测试用例移除中';
        break;
      case ACTION_TYPE_ENUM.RETRY:
        Modal.destroyAll();
        data = await retryBatchAction({
          ...(params as RetryPayload),
          key: processBarKey,
        });
        title = '重试中';
        break;
      case ACTION_TYPE_ENUM.COPY_FOLDER:
        data = await copyFolder({
          ...(params as CopyFolderPayload),
          key: processBarKey,
        });
        title = '模块移动中';
        break;
    }

    if (data?.status === 'error') {
      throw new Error(data.data);
    }

    const batchResultParams = {
      processBarKey,
      handleSuccess,
      handleFail,
      hideNotification,
    };

    const infoConfig = {
      title: propsTitle || title,
      content: <BatchResult {...batchResultParams} />,
      getContainer: getRootContainer,
      footer: null,
      closable: true,
      zIndex,
    };
    //  todo 批量当单个处理时候，隐藏通知，在外面处理成功或者失败的逻辑
    if (zIndex === undefined) {
      delete infoConfig.zIndex;
    }

    info(infoConfig);
  } catch (e) {
    handleFail?.(e);
  }
}
