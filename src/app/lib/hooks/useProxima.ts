import { useDeepCompareEffect } from 'ahooks';
import _ from 'lodash';
import React from 'react';

import { SYSTEM_FIELD } from '@/lib/constants';
import { ItemTypeScreenSchemeMapping, Screen, Workspace } from '@/lib/models';
import Parse from '@/lib/parse';

import { useNoExpiredRequest } from './useRequest';

/** 获取看板卡片渲染字段 props */
export const useFieldsWithFieldCellProps = fields => {
  /** table cell props */
  const fieldsWithFieldCellProps = React.useMemo(() => {
    const cellTextPropGetter = field => card => {
      const { key } = field || {};

      switch (key) {
        case SYSTEM_FIELD.Key:
        case SYSTEM_FIELD.Name:
        case SYSTEM_FIELD.Status:
        case SYSTEM_FIELD.ItemType:
        case SYSTEM_FIELD.UpdatedAt:
        case SYSTEM_FIELD.CreatedAt:
        case SYSTEM_FIELD.Workspace:
        case SYSTEM_FIELD.CreatedBy:
        case SYSTEM_FIELD.UpdatedBy:
        case SYSTEM_FIELD.ItemGroup:
          return card[key];
        default:
          return card.values[key];
      }
    };
    return (
      fields
        ?.map(field => ({
          key: field.key,
          // render 时获取 text props
          text: cellTextPropGetter(field),
          readonly: true,
          data: field.data,
          dataIndex: field.key,
          property: {
            ...field.property,
            hiddenAvatar: true,
            displayDeletedUser: true,
          },
          objectId: field.objectId,
          type: field.fieldType?.key,
          description: field.description,
        }))
        .filter(Boolean) || []
    );
  }, [fields]);

  return fieldsWithFieldCellProps;
};

// TODO: 此处逻辑需要同步至 proxima-share-component
/** 获取用户表格字段 userData 数据 */
export const useUserCellUserDataProp = workspaceKey => {
  const [userData, setUserData] = React.useState({});

  React.useEffect(() => {
    (async () => {
      if (!workspaceKey) return;
      const query = new Parse.Query(Parse.Role)
        .matchesQuery('workspace', new Parse.Query(Workspace).equalTo('key', workspaceKey))
        .startsWith('name', 'all_member_workspace')
        .select('objectId');
      const value = await query.find();
      const userRoles = value.map(v => v.toJSON().objectId) || [];
      setUserData({ userRoles });
    })();
  }, [workspaceKey]);

  return userData;
};

/** 获取空间界面方案自定义字段 keys */
export const useUsedScreenFieldKeys = (
  workspaceKey: string,
  itemTypeKey: string,
  shouldHiddenFieldKeys = [],
) => {
  const [result, setResult] = React.useState<string[] | undefined>(undefined);
  /** 从界面类型方案中获取 screenId */
  const getScreenIdByScreenScheme = screenScheme => {
    const ScreenTypes = ['defaultScreen', 'viewScreen', 'createScreen', 'editScreen'];
    return [...new Set(ScreenTypes.map(type => screenScheme?.[type]?.objectId).filter(Boolean))];
  };

  // 获取空间界面方案关联的全部方案
  const { data: itemUsedFieldKeyMapping } = useNoExpiredRequest(
    async () => {
      const workspace = await new Parse.Query(Workspace)
        .select(['itemTypeScreenScheme'])
        .include(['itemTypeScreenScheme.defaultScreenScheme'])
        .equalTo('key', workspaceKey)
        .first()
        .then(item => item?.toJSON());

      const { itemTypeScreenSchemeMappings, defaultScreenScheme } =
        workspace?.itemTypeScreenScheme ?? {};

      const itemTypeKeyScreenSchemeMapping = {
        default: getScreenIdByScreenScheme(defaultScreenScheme),
      };

      if (itemTypeScreenSchemeMappings?.length > 0) {
        const itemTypeMappings = await new Parse.Query(ItemTypeScreenSchemeMapping)
          .include(['itemType', 'screenScheme'])
          .select(['itemType', 'screenScheme'])
          .containedIn(
            'objectId',
            itemTypeScreenSchemeMappings.map(item => item.objectId),
          )
          .findAll();

        itemTypeMappings.forEach(data => {
          const { itemType, screenScheme } = data.toJSON();
          itemTypeKeyScreenSchemeMapping[itemType?.key] = getScreenIdByScreenScheme(screenScheme);
        });
      }

      const needQueryScreenIds = Object.values(itemTypeKeyScreenSchemeMapping).reduce(
        (acc, screenIds) => {
          return [...new Set(acc.concat(screenIds))];
        },
        [],
      );

      const screens = await new Parse.Query(Screen)
        .containedIn('objectId', needQueryScreenIds)
        .select(['customFieldKeys'])
        .findAll();

      const itemTypeScreenUsedFieldKeysMapping = _.keyBy(
        screens.map(i => i.toJSON()),
        'objectId',
      );

      const itemUsedFieldKeyMapping = {};
      Object.entries(itemTypeKeyScreenSchemeMapping).forEach(([itemTypeKey, screenIds]) => {
        itemUsedFieldKeyMapping[itemTypeKey] = _.chain(screenIds)
          .map(id => itemTypeScreenUsedFieldKeysMapping[id]?.customFieldKeys)
          .flattenDeep()
          .uniq()
          .value();
      }, {});

      return itemUsedFieldKeyMapping as Record<'default' | string, string[]>;
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [workspaceKey],
      cacheKey: `ItemTypeUsedFieldKey_${workspaceKey}`,
    },
  );

  useDeepCompareEffect(() => {
    if (itemUsedFieldKeyMapping && itemTypeKey) {
      const fieldKeys = _.difference(
        [].concat(itemUsedFieldKeyMapping?.[itemTypeKey] ?? itemUsedFieldKeyMapping?.default ?? []),
        shouldHiddenFieldKeys,
      );

      setResult(fieldKeys);
    }
  }, [itemUsedFieldKeyMapping, itemTypeKey]);

  return result;
};
