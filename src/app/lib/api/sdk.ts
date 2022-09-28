import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { EXINCLUDE_FIELDS, TEST_MANAGER_PLUGIN_KEY } from '@/lib/constants';
import { CustomField } from '@/lib/models';
import Parse from '@/lib/parse';
import { lib } from 'proxima-sdk';

const { INCLUDE_FILTER_FIELD_TYPES } = lib.Global;

const proximaSDK = createProximaSdk();

/**
 * 打开事项创建弹窗
 */
export const openCreateItemModal = ({ itemTypeId, workspaceId, name, extraData }) => {
  proximaSDK.execute('openItemCreateScreen', {
    extraData: {
      hideMessage: true,
      ...extraData,
      key: TEST_MANAGER_PLUGIN_KEY,
      // 通过此参数可修改事项创建弹窗 displayModule，控制测试管理内置类型是否出现在类型选择器
      displayModule: 'plugin.testManager',
      planId: extraData?.planId,
    },
    initItemData: {
      name: name,
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
 * 打开筛选器popver
 */
export const openFilterPopover = async ({ fields, selectors, onChange, extendFields, dom }) => {
  // 获取字段的fieldType
  const customFields = await new Parse.Query(CustomField)
    .include('fieldType')
    .containedIn('key', fields)
    .find();

  const includeFileds = INCLUDE_FILTER_FIELD_TYPES?.filter(
    field => !EXINCLUDE_FIELDS?.includes(field) ?? [],
  );

  const _customFields = customFields
    .map(item => item.toJSON())
    .filter(d => includeFileds?.includes(d.fieldType.key));

  // proximaSDK.execute不能传递函数，限制太多
  window.QiankunProps.openFilterPopover({
    selectors,
    list: [..._customFields, ...extendFields],
    onChange,
    dom,
  });
};

/**
 * 打开筛选器选值popver
 */
export const openFieldValuePopover = async ({
  isExtend,
  value,
  fieldId,
  workspace,
  onChange,
  onClose,
  field,
  fetchMethod,
  dom,
  expression,
  label,
}) => {
  // proximaSDK.execute不能传递函数，限制太多
  window.QiankunProps.openFieldValuePopover({
    isExtend,
    workspace,
    fieldId,
    onChange,
    value,
    onClose,
    field,
    fetchMethod,
    dom,
    expression,
    label,
  });
};
