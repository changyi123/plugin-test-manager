import difference from 'lodash/difference';
import keyBy from 'lodash/keyBy';

import {
  InfinityLimit,
  IQLUsefulFieldKeys,
  SystemField,
  TestFiledKeyMapping,
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
          if (action === 'delete') {
            const linkItems = difference(originalLinkItems, value);
            processedLinkData.linkItems = linkItems?.length ? linkItems : [];
            if (originalLinkType && !linkItems?.length) {
              processedLinkData.linkType = null;
            }
          } else {
            console.info(value, originalLinkItems, 'add linkItems');
            if (value.every(i => originalLinkItems.includes(i))) return;
            processedLinkData.linkItems = Array.from(new Set([].concat(originalLinkItems, value)));
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

export const getTextFromEditorOrString = data => {
  if (typeof data === 'string') {
    return data;
  } else {
    const [forMinderText] = data;
    return forMinderText.stringText;
  }
};

export const toPointer = (className: string, objectId: string) => ({
  __type: 'Pointer',
  className,
  objectId,
});
