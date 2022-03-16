import React from 'react';
import { get, keyBy } from 'lodash';
import { useRequest } from 'ahooks';
import { store } from '@nebulare/data';
import { getDevConfig } from '@/devEnv';
import TestDetailForm from './TestDetailForm';
import { useSDK } from '@projectproxima/plugin-sdk';
import { getAllTestConfigs } from '@/lib/api/common';
import { getWorkspaceById, getItemTypeById } from '@/lib/api/proxima';
import { ExtensionValType, TestType, CREATE_ITEM_STORE_FIELD_KEY } from '@/lib/constants';

const getUpdateParamsByStoreValues = storeValues => ({
  workspaceId: get(storeValues, 'workspace[0]'),
  itemTypeId: get(storeValues, 'itemType[0]'),
});

const BeforeCreateOrUpdateModal = () => {
  const { context } = useSDK();
  const storeValues = store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM);

  const { data: itemTypeMappingDict } = useRequest(
    async () => {
      const result = await getAllTestConfigs(['itemTypeMap', 'workspaceKey']);
      const allConfigs = result.map(item => item.toJSON());
      return keyBy(allConfigs, 'workspaceKey');
    },
    {
      ready: Boolean(storeValues.extraData),
      cacheKey: 'ALL_CONFIGS',
      cacheTime: 9999999999,
      staleTime: 9999999999,
    },
  );

  const initialRef = React.useRef(false);
  const workspaceMappingCacheRef = React.useRef({});
  const itemTypeMappingCacheRef = React.useRef({});

  const [currentModalValues, setCurrentModalValues] = React.useState({
    workspaceKey: context?.workspaceKey ?? getDevConfig().workspaceKey,
    itemTypeKey: '',
  });

  const updateCurrentModalValues = React.useCallback(async ({ workspaceId, itemTypeId } = {}) => {
    const props = {
      workspaceKey: workspaceMappingCacheRef.current[workspaceId],
      itemTypeKey: itemTypeMappingCacheRef.current[itemTypeId],
    } as Record<string, string>;

    if (workspaceId && !props.workspaceKey) {
      const workspace = await getWorkspaceById(workspaceId);
      if (workspace?.key) {
        props.workspaceKey = workspace.key;
        workspaceMappingCacheRef.current = {
          ...workspaceMappingCacheRef.current,
          [workspaceId]: workspace.key,
        };
      }
    }

    if (itemTypeId && !props.itemTypeKey) {
      const itemType = await getItemTypeById(itemTypeId);
      if (itemType?.key) {
        props.itemTypeKey = itemType.key;
        itemTypeMappingCacheRef.current = {
          ...itemTypeMappingCacheRef.current,
          [itemTypeId]: itemType.key,
        };
      }
    }

    setCurrentModalValues(prevState => ({
      ...prevState,
      ...props,
    }));
  }, []);

  const testDetailFormVisible = React.useMemo(() => {
    if (!storeValues.extraData) return false;
    const testDetailRefItemTypeKey =
      itemTypeMappingDict?.[currentModalValues.workspaceKey]?.itemTypeMap?.[TestType.TestDetail];

    return testDetailRefItemTypeKey && testDetailRefItemTypeKey === currentModalValues.itemTypeKey;
  }, [currentModalValues, itemTypeMappingDict, storeValues]);

  React.useEffect(() => {
    if (initialRef.current) return;
    initialRef.current = true;
    updateCurrentModalValues(getUpdateParamsByStoreValues(storeValues));
  }, [storeValues, updateCurrentModalValues]);

  React.useEffect(() => {
    const handleCreateOrUpdateItemMsg = values => {
      updateCurrentModalValues(getUpdateParamsByStoreValues(values));
    };

    store.on(ExtensionValType.CREATE_OR_UPDATE_ITEM, handleCreateOrUpdateItemMsg);
    return () => {
      store.off(ExtensionValType.CREATE_OR_UPDATE_ITEM, handleCreateOrUpdateItemMsg);
    };
  }, [updateCurrentModalValues]);

  const handleDetailFormChange = values => {
    const prevStoreValues = store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM);
    console.log('prevStoreValues', prevStoreValues);
    store.set(ExtensionValType.CREATE_OR_UPDATE_ITEM, {
      ...prevStoreValues,
      [CREATE_ITEM_STORE_FIELD_KEY]: values,
    });
  };

  return testDetailFormVisible ? (
    <TestDetailForm
      onChange={handleDetailFormChange}
      values={storeValues?.[CREATE_ITEM_STORE_FIELD_KEY]}
    />
  ) : null;
};

export default BeforeCreateOrUpdateModal;
