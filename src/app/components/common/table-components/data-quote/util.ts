import { Item, ItemType, Status, Workspace } from '../models';
import { selectValue as selectValueProps } from './types';

const DATA_QUOTE_OPTION_FORMAT_REG = /{(\S+?)}/g;

const dataQuoteOptionFormat = (data: Item, display?: string): selectValueProps => {
  if (!data) return undefined;
  const dataCopy = {
    ...data,
    status: (data.status as Status)?.name,
    itemType: (data.itemType as ItemType)?.name,
    workspace: (data.workspace as Workspace)?.name,
  };
  return {
    label: display
      ? display.replace(DATA_QUOTE_OPTION_FORMAT_REG, function (itemKey) {
          // 根据字段的显示设置，拼接label
          const key = itemKey.slice(1, itemKey.length - 1);
          return dataCopy[key] || (data.values && data.values[key]) || '';
        })
      : data.name,
    value: data.objectId,
    name: data.name,
    key: data.key,
    itemType: data.itemType,
    workspace: data.workspace,
    icon: data?.itemType?.icon,
    values: data.values,
  };
};

// 根据字段配置拼接option显示
export const dataQuoteInit = (
  dates: Item[],
  value: string[],
  display?: string,
): selectValueProps[] => {
  const existedDatas = dates?.filter(data => value?.includes(data.objectId));
  const dataInit = existedDatas?.map(existedData => dataQuoteOptionFormat(existedData, display));
  return dataInit;
};
