import createProximaSdk from '@projectproxima/proxima-sdk-js';
import { TEST_MANAGER_PLUGIN_KEY } from '@/lib/constants';

const proximaSDK = createProximaSdk();

/**
 * 打开事项创建弹窗
 */
export const openCreateItemModal = ({ itemTypeId, workspaceId, extraData }) => {
  proximaSDK.execute('openItemCreateScreen', {
    extraData: {
      ...extraData,
      key: TEST_MANAGER_PLUGIN_KEY,
    },
    initItemData: {
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
