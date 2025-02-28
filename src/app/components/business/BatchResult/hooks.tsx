import { Modal } from 'antd';
import {
  BatchCopyTestCaseV2Payload,
  BatchCopyTestCaseV3Payload,
  BatchCreateTestRunV2Payload,
  BatchDeletePayload,
  BatchDeleteV2Payload,
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
} from '@/lib/api/item';
import { getRootContainer } from '@/lib/utils/helper';

const { info } = Modal;

type WithFunction<T> = T & {
  handleSuccess: (data: unknown) => void;
  handleFail?: (error?: Error) => void;
  actionType?: string;
};

export async function createTestRunWithProcess(props: WithFunction<BatchCreateTestRunV2Payload>) {
  const { handleSuccess: originHandleSuccess, handleFail, ...createParams } = props;

  const handleSuccess = async props => {
    Modal.destroyAll();
    await originHandleSuccess(props);
  };

  const processBarKey = uuid();
  try {
    const { data } = await batchCreateTestRunV2({
      ...createParams,
      key: processBarKey,
    });
    if (data?.status === 'error') {
      throw new Error(data.data);
    }

    const batchResultParams = {
      processBarKey,
      handleSuccess,
      handleFail,
    };

    info({
      title: '规划用例中',
      content: <BatchResult {...batchResultParams} />,
      getContainer: getRootContainer,
      closable: true,
      footer: null,
    });
  } catch (e) {
    handleFail(e);
  }
}

export async function importTestCaseWithProcess(props: WithFunction<BatchCopyTestCaseV3Payload>) {
  const { handleSuccess: originHandleSuccess, handleFail, ...copyParams } = props;

  const handleSuccess = async props => {
    Modal.destroyAll();
    await originHandleSuccess(props);
  };

  const processBarKey = uuid();
  try {
    const { data } = await copyTestCaseV3({
      ...copyParams,
      key: processBarKey,
    });
    if (data?.status === 'error') {
      throw new Error(data.data);
    }

    const batchResultParams = {
      processBarKey,
      handleSuccess,
      handleFail,
    };

    info({
      title: '用例导入中',
      content: <BatchResult {...batchResultParams} />,
      getContainer: getRootContainer,
      closable: true,
      footer: null,
    });
  } catch (e) {
    handleFail(e);
  }
}

export async function copyTestCaseWithProcess(props: WithFunction<BatchCopyTestCaseV2Payload>) {
  const { handleSuccess: originHandleSuccess, handleFail, ...copyParams } = props;

  const handleSuccess = async props => {
    Modal.destroyAll();
    await originHandleSuccess(props);
  };

  const processBarKey = uuid();
  try {
    const { data } = await copyTestCaseV2({
      ...copyParams,
      key: processBarKey,
    });
    if (data?.status === 'error') {
      throw new Error(data.data);
    }

    const batchResultParams = {
      processBarKey,
      handleSuccess,
      handleFail,
    };

    info({
      title: '用例复制中',
      content: <BatchResult {...batchResultParams} />,
      getContainer: getRootContainer,
      closable: true,
      footer: null,
    });
  } catch (e) {
    handleFail(e);
  }
}

export async function deleteWithProcess(
  props: WithFunction<BatchDeleteV2Payload | BatchDeletePayload>,
) {
  const { actionType, handleSuccess: originHandleSuccess, handleFail, ...deleteParams } = props;

  const handleSuccess = async props => {
    Modal.destroyAll();
    await originHandleSuccess(props);
  };

  const processBarKey = uuid();
  try {
    let data;
    switch (actionType) {
      case 'deleteV1':
        data = await deleteTestEntity({
          ...deleteParams,
          key: processBarKey,
        });
        break;
      case 'deleteV2':
        data = await deleteTestEntityV2({
          ...deleteParams,
          key: processBarKey,
        });
        break;
    }

    if (data?.status === 'error') {
      throw new Error(data.data);
    }

    const batchResultParams = {
      processBarKey,
      handleSuccess,
      handleFail,
    };

    info({
      title: '移除中',
      content: <BatchResult {...batchResultParams} />,
      getContainer: getRootContainer,
      closable: true,
      footer: null,
    });
  } catch (e) {
    handleFail(e);
  }
}
