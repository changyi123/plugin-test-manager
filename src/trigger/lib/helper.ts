import { getParseModel, getParseQuery, saveAllObject } from '@giteeteam/apps-team-api';
import difference from 'lodash/difference';
import keyBy from 'lodash/keyBy';

import {
  InfinityLimit,
  IQLUsefulFieldKeys,
  SystemField,
  TestFiledKeyMapping,
  TestLinkType,
} from '../../common/constant';
import { TestEntityLinkActionData } from '../../common/types/common';
import { iqlRequest } from './iqlRequest';
import { throwArgumentError } from './validator';

export const toArray = data => (Array.isArray(data) ? data : [data]);

export const uuidv4 = () => {
  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //含最大值，含最小值
  }

  return ([1e7].toString() + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (+c ^ (getRandomIntInclusive(0, 100) & (15 >> (+c / 4)))).toString(16),
  );
};

export const generateSortIndex = (index = 0) => {
  return Math.floor(Date.now() / 1000) * 10e5 + index * 1000;
};

// 处理 iql 请求的自定义字段
export const concatIqlRequestFields = fields => {
  // fields 字段需要拼接测试实体字段和事项的必填字段
  return Array.from(new Set([].concat(IQLUsefulFieldKeys, fields)));
};

/**
 * 构建事项更新的关联数据(将含有参数中 linkItems 的数据转换成事项自定义字段数据)
 *   // linkItems 支持 { action: 'add' | 'delete', value: [] } 格式更新
 */
export const buildTestEntityLinkData = async (data: TestEntityLinkActionData[]) => {
  const isActionSchema = data =>
    ['add', 'delete'].includes(data?.action) && Array.isArray(data?.value);

  // linkItems 支持 { action: 'add' | 'delete', value: [] } 格式更新
  // 需要对该类型参数进行处理
  const needProcessedEntityIds = data
    .filter(item => isActionSchema(item.linkItems))
    .map(item => item.objectId);

  let needUpdateItemData = data as any;

  console.info(JSON.stringify(needProcessedEntityIds), 'needProcessedEntityIds');

  if (needProcessedEntityIds?.[0]) {
    const {
      data: { list: originalTestEntityMapping },
    } = await iqlRequest({
      query: {
        id: needProcessedEntityIds,
      },
      fields: [SystemField.Id, TestFiledKeyMapping.linkItems, TestFiledKeyMapping.linkType],
      pagination: {
        limit: InfinityLimit,
      },
      dataTransfer: data => keyBy(data, 'objectId'),
    });

    console.info(JSON.stringify(originalTestEntityMapping), 'originalTestEntityMapping');

    const updateDataQuote = (isCaseOrExecution, originalLinkType, processedLinkData) => {
      // 如果为用例或者执行任务时，需要同步更新测试计划引用字段
      if (isCaseOrExecution) {
        processedLinkData.testPlans = processedLinkData.linkItems;
      } else if (originalLinkType === TestLinkType.RunLinkExecution) {
        // 测试执行，同步更新测试执行任务引用字段
        processedLinkData.testExecutions = processedLinkData.linkItems;
      }
    };

    needUpdateItemData = data
      .map(item => {
        const { linkItems, objectId } = item;

        if (isActionSchema(linkItems)) {
          const originalTestEntity = originalTestEntityMapping[objectId];
          if (!originalTestEntity) return;
          const { linkItems: originalLinkItems = [], linkType: originalLinkType } =
            originalTestEntity;

          const { action, value } = linkItems as any;
          const processedLinkData = { linkItems: value } as any;
          const isCaseOrExecution = [
            TestLinkType.CaseLinkPlan,
            TestLinkType.ExecutionLinkPlan,
          ].includes(originalLinkType);
          if (action === 'delete') {
            const linkItems = difference(originalLinkItems, value);
            processedLinkData.linkItems = linkItems?.length ? linkItems : [];
            updateDataQuote(isCaseOrExecution, originalLinkType, processedLinkData);

            if (originalLinkType && !linkItems?.length) {
              processedLinkData.linkType = null;
            }
          } else {
            console.info(value, originalLinkItems, 'add linkItems');
            if (value.every(i => originalLinkItems.includes(i))) return;
            processedLinkData.linkItems = Array.from(new Set([].concat(originalLinkItems, value)));
            updateDataQuote(isCaseOrExecution, originalLinkType, processedLinkData);
          }

          return {
            ...item,
            ...processedLinkData,
          };
        }

        return;
      })
      .filter(Boolean);
  }

  console.info(JSON.stringify(needUpdateItemData), 'needUpdateItemData');

  return needUpdateItemData;
};

export const getAllEntity = async (queryParams, fields?: string[]) => {
  const onlySelectId = !fields;
  if (!queryParams) throwArgumentError('queryParams', '{ query, selector }');
  let caseIds = [];
  let total = 0;
  do {
    const res = await iqlRequest({
      ...queryParams,
      ascending: ['sortIndex', 'createdAt'],
      pagination: { limit: 9999, offset: caseIds.length },
      fields: onlySelectId ? ['id'] : fields,
    });
    const entities = onlySelectId ? res.data.list.map(({ objectId }) => objectId) : res.data.list;
    caseIds = caseIds.concat(entities);
    total = res.data.total;
  } while (caseIds.length < total);

  return caseIds;
};

export const getMaxSortIndex = async selector => {
  const res = await iqlRequest({
    selector,
    descending: ['sortIndex', 'createdAt'],
    pagination: { limit: 1 },
    fields: [TestFiledKeyMapping.sortIndex],
  });
  return res.data.list[0].sortIndex ?? generateSortIndex();
};

export const getTextFromEditorOrString = data => {
  if (Array.isArray(data)) {
    const [forMinderText] = data;
    return forMinderText?.stringText;
  } else {
    return data;
  }
};

// 初始化进度条
export const initProcessBar = async (key: string, desc?: string): Promise<string> => {
  const existedProcess = await getParseQuery(false, 'ProcessBar')
    .select(['objectId'])
    .equalTo('key', key)
    .first({ useMasterKey: true });
  const ProcessBar = getParseModel(false, 'ProcessBar');

  const processBar = existedProcess
    ? ProcessBar.createWithoutData(existedProcess.id)
    : new ProcessBar();
  processBar.set('key', key);
  if (desc) {
    processBar.set('desc', desc);
  }
  processBar.set('percentage', 0);
  const result = await saveAllObject([processBar]);
  return result[0]?.id;
};

// 更新进度条
export const updateProcessBar = async (
  id: string,
  value: number,
  message?: string,
): Promise<void> => {
  if (!id) return;
  const ProcessBar = getParseModel(false, 'ProcessBar');
  const processBar = ProcessBar.createWithoutData(id);

  processBar.set('percentage', value);
  if (message) {
    processBar.set('desc', message);
  }
  await saveAllObject([processBar]);
};

export const toPointer = (className: string, objectId: string) => ({
  __type: 'Pointer',
  className,
  objectId,
});

export function chunkArray<T>(array: Array<T>, maxChunkSize: number): Array<T>[] {
  const chunks = [];
  for (let i = 0; i < array.length; i += maxChunkSize) {
    chunks.push(array.slice(i, i + maxChunkSize));
  }
  return chunks;
}

export const wait = async (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

interface IExecFuncWithWaitParams<T> {
  func: () => Promise<T>;
  validate: (res: T) => boolean;
  label: string;
}

/**
 *
 * @param props
 * @returns
 */
export async function execFuncWitRetry<T>(props: IExecFuncWithWaitParams<T>): Promise<T> {
  const { func, validate, label } = props;
  let done = false;
  let count = 1;
  let res;
  while (!(done || count > 100)) {
    try {
      res = await func();
    } catch (error) {
      console.info(`execFuncWithWait ${label} error`, count, error);
    }

    if (validate(res as T)) {
      done = true;
    } else {
      count += 1;
      await wait(count * 1000);
    }
    console.info(`execFuncWithWait ${label} count`, count, done);
  }
  return res as T;
}

// 记录批量操作记录
export const insertBatchRecord = async (params: {
  type: string;
  items: string[];
  params: any;
  error?: any;
  retryId?: string;
}): Promise<string> => {
  const BatchRecord = getParseModel(true, 'BatchHandleRecord');
  const record = new BatchRecord(params);
  // TODO 目前失败时才插入
  record.set('status', 'fail');
  const result = await saveAllObject([record]);
  return result[0]?.id;
};

// 更新批量操作记录
export const updateBatchRecordsDone = async (ids: string[]): Promise<void> => {
  if (!ids.length) return;
  const BatchRecord = getParseModel(true, 'BatchHandleRecord');
  const records = ids.map(id => {
    const record = BatchRecord.createWithoutData(id);
    record.set('status', 'done');
    return record;
  });
  await saveAllObject(records);
};
