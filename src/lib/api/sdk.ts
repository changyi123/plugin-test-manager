import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { TEST_MANAGER_PLUGIN_KEY } from '@/lib/constants';

const proximaSDK = createProximaSdk();

/**
 * 打开事项创建弹窗
 */
export const openCreateItemModal = ({ itemTypeId, workspaceId, name, extraData }) => {
  proximaSDK.execute('openItemCreateScreen', {
    extraData: {
      hideMessage: false,
      ...extraData,
      key: TEST_MANAGER_PLUGIN_KEY,
      // 通过此参数可修改事项创建弹窗 displayModule，控制测试管理内置事项类型是否出现在事项类型选择器
      displayModule: 'plugin.testManager',
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
