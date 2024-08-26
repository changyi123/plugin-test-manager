import { store } from '@nebulare/data';
import { useSDK } from '@projectproxima/plugin-sdk';
import { useRequest } from 'ahooks';
import { get } from 'lodash';
import React from 'react';

import { getDevConfig } from '@/devEnv';
import { getItemTypeById, getWorkspaceById } from '@/lib/api/proxima';
import { CREATE_ITEM_STORE_FIELD_KEY, ExtensionValType, TestType } from '@/lib/constants';
import { TestConfig } from '@/services/models';

import TestDetailForm from './TestDetailForm';

const getUpdateParamsByStoreValues = storeValues => ({
  workspaceId: get(storeValues, 'workspace[0]'),
  itemTypeId: get(storeValues, 'itemTypeValue') ?? get(storeValues, 'itemType[0]'),
});

const BeforeCreateOrUpdateModal = () => {
  const { context } = useSDK();
  const storeValues = store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM);
  const [testDetailValues, setTestDetailValues] = React.useState(storeValues);

  // 创建弹窗才有 extraData
  const isCreateModal = !!storeValues.extraData;

  const { data: itemTypeMappingDict } = useRequest(
    async () => {
      const result = await new Parse.Query(TestConfig)
        .select('itemTypeMap')
        .equalTo('workspaceKey', context.workspaceKey)
        .first();
      return result.toJSON();
    },
    {
      ready: Boolean(context?.workspaceKey),
      refreshDeps: [context?.workspaceKey],
    },
  );

  const workspaceMappingCacheRef = React.useRef({});
  const itemTypeMappingCacheRef = React.useRef({});

  const [currentModalValues, setCurrentModalValues] = React.useState({
    workspaceKey: context?.workspaceKey ?? getDevConfig().workspaceKey,
    itemTypeKey: '',
  });

  const updateCurrentModalValues = React.useCallback(
    async ({ workspaceId, itemTypeId } = {} as any) => {
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
    },
    [],
  );

  const testDetailFormVisible = React.useMemo(() => {
    // if (!storeValues.extraData) return false;
    const testDetailRefItemTypeKey = itemTypeMappingDict?.itemTypeMap?.[TestType.Case];

    return testDetailRefItemTypeKey && testDetailRefItemTypeKey === currentModalValues.itemTypeKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentModalValues.itemTypeKey, itemTypeMappingDict?.id]);

  React.useEffect(() => {
    const handleCreateOrUpdateItemMsg = values => {
      updateCurrentModalValues(getUpdateParamsByStoreValues(values));
    };
    // 主动获取值，store 触发更新时，插件可能没有就绪
    updateCurrentModalValues(
      getUpdateParamsByStoreValues(store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM)),
    );
    store.on(ExtensionValType.CREATE_OR_UPDATE_ITEM, handleCreateOrUpdateItemMsg);
    return () => {
      store.off(ExtensionValType.CREATE_OR_UPDATE_ITEM, handleCreateOrUpdateItemMsg);
    };
  }, [updateCurrentModalValues]);

  const handleDetailFormChange = values => {
    const prevStoreValues = store.get(ExtensionValType.CREATE_OR_UPDATE_ITEM);
    store.set(ExtensionValType.CREATE_OR_UPDATE_ITEM, {
      ...prevStoreValues,
      [CREATE_ITEM_STORE_FIELD_KEY]: values,
    });
    setTestDetailValues(values);
  };

  return isCreateModal && testDetailFormVisible ? (
    <TestDetailForm
      onChange={handleDetailFormChange}
      extraData={storeValues?.extraData}
      values={testDetailValues}
    />
  ) : null;
};

export default BeforeCreateOrUpdateModal;
