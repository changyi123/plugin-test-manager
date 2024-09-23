import { message } from 'antd';
import { cloneDeep, isEqual } from 'lodash';

const RICH_TEXT_EMPTY_VALUE = { type: 'p', children: [{ text: '' }] };

const isEmptyEditorValue = value => {
  if (!Array.isArray(value)) return true;
  if (value.length === 0) return true;
  if (value.length > 1) return false;
  const [richText] = value;

  const checkValue = cloneDeep(richText);
  delete checkValue?.id;

  return isEqual(checkValue, RICH_TEXT_EMPTY_VALUE);
};

export const checkRunStatus = (testRun, status, statusesConfig, t) => {
  const { executeResultDesc, steps } = testRun?.runDetail || {};

  // 校验结果描述
  if (isEmptyEditorValue(executeResultDesc)) {
    message.error(t('common.descriptionRequire'));
    return false;
  }

  // 没有步骤时不校验
  if (!steps?.length) {
    return true;
  }

  //  'TODO' | 'PASSED' | 'EXECUTING' | 'FAILED' | 'BLOCK' | 'CANCEL'

  const currentStatusKey = status.type;

  if (currentStatusKey === 'PASSED') {
    // 用例通过，步骤至少一个通过，其他步骤状态为取消或者通过
    const hasPass = steps.some(step => step.status === 'PASSED');
    const onlyCancelAndPass = steps.every(step => ['PASSED', 'CANCEL'].includes(step.status));
    if (hasPass && onlyCancelAndPass) {
      return true;
    }
    message.error(t('common.stepStatusNoMatch'));
    return false;
  } else if (currentStatusKey === 'FAILED') {
    // 用例失败，步骤至少一个失败
    const hasPass = steps.some(step => step.status === 'FAILED');
    if (!hasPass) {
      message.error(t('common.stepStatusNoMatch'));
      return false;
    }
    return true;
  } else if (currentStatusKey === 'BLOCK') {
    // 用例阻塞，步骤至少一个阻塞且步骤没有失败
    const hasBlock = steps.some(step => step.status === 'BLOCK');
    const hasFail = steps.some(step => step.status === 'FAILED');

    if (hasBlock && !hasFail) {
      return true;
    }
    message.error(t('common.stepStatusNoMatch'));
    return false;
  } else if (currentStatusKey === 'EXECUTING') {
    // 用例执行中，步骤至少一个为未开始
    const hasTodo = steps.some(step => step.status && step.status !== 'TODO');

    if (hasTodo) {
      return true;
    }
    message.error(t('common.stepStatusNoMatch'));
    return false;
  } else if (currentStatusKey === 'CANCEL') {
    // 用例已取消，步骤全都为取消
    const isCancel = steps.every(step => step.status === 'CANCEL');
    if (isCancel) {
      return true;
    }

    message.error(t('common.stepStatusNoMatch'));
    return false;
  }

  return true;
};
