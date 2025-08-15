import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { lib } from 'proxima-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';

import { EXCLUDE_FILTER_KEYS, EXINCLUDE_FIELDS, TEST_MANAGER_PLUGIN_KEY } from '@/lib/constants';
import Parse from '@/lib/parse';
import { CustomField } from '@/services/models';

const { INCLUDE_FILTER_FIELD_TYPES } = lib.Global;

const proximaSDK = createProximaSdk();

/**
 * 打开事项创建弹窗
 */
export const openCreateItemModal = ({
  itemTypeId,
  workspaceId,
  name,
  extraData,
  defaultValues = {},
}) => {
  proximaSDK.execute('openItemCreateScreen', {
    extraData: {
      hideMessage: true,
      ...extraData,
      key: TEST_MANAGER_PLUGIN_KEY,
      // 通过此参数可修改事项创建弹窗 displayModule，控制测试管理内置类型是否出现在类型选择器
      displayModule: 'plugin.testManager',
      planId: extraData?.planId,
      caseVersion: extraData?.caseVersion,
      filterItemTypeList: true,
    },
    defaultValues,
    initItemData: {
      defaultName: name,
      workspace: {
        objectId: workspaceId,
      },
      itemType: {
        objectId: itemTypeId,
      },
    },
  });
};

/**
 * 打开事项详情 panel
 */
export const openItemDetailPanel = (itemId: string) => {
  proximaSDK.execute('openItemViewScreen', itemId);
};

/**
 * 打开快照弹框
 */
export const openBaseLineViewItemModal = (itemKey: string, baseLineItemId: string) => {
  proximaSDK.execute('openBaseLineViewItemModal', { itemKey, baseLineItemId });
};

export const useOpenFilterPopover = fields => {
  const fieldsDataMap = useRef({});
  const [customFields, setCustomFields] = useState([]);

  useEffect(() => {
    const fetchData = async fields => {
      if (!fields.length) return;
      // 获取字段的fieldType
      const customFields = await new Parse.Query(CustomField)
        .include('fieldType')
        .containedIn('key', fields)
        .find();
      setCustomFields(customFields);
      fieldsDataMap.current = customFields.reduce(
        (map, cur) => ({ ...map, [cur.id]: cur.get('data') }),
        {},
      );
    };
    fetchData(fields);
  }, [fields]);

  /**
   * 打开筛选器popver
   */
  const openFilterPopover = useCallback(
    async ({ selectors, onChange, extendFields, iqlFunctionFilters, dom }) => {
      const includeFileds = INCLUDE_FILTER_FIELD_TYPES?.filter(
        field => !EXINCLUDE_FIELDS?.includes(field),
      );
      const _customFields = customFields
        .map(item => item.toJSON())
        .filter(d => includeFileds?.includes(d.fieldType.key))
        ?.filter(item => !EXCLUDE_FILTER_KEYS.includes(item.key));

      // proximaSDK.execute不能传递函数，限制太多
      window.QiankunProps.openFilterPopover({
        showChoosedInSearch: false,
        selectors,
        list: [..._customFields, ...extendFields, ...iqlFunctionFilters],
        onChange,
        dom,
      });
    },
    [customFields],
  );

  return {
    openFilterPopover,
    fieldsDataMap,
  };
};
/**
 * 打开筛选器选值popver
 */
export const openFieldValuePopover = async props => {
  // proximaSDK.execute不能传递函数，限制太多
  window.QiankunProps.openFieldValuePopover(props);
};
