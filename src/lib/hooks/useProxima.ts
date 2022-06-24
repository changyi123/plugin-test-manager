import React from 'react';
import _ from 'lodash';
import Parse from '@/lib/parse';
import { SYSTEM_FIELD } from '@/lib/constants';
import { useNoExpiredRequest } from './useRequest';
import { Workspace, Screen, ItemTypeScreenSchemeMapping } from '@/lib/models';

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

const SystemFieldKeys = [
  // SYSTEM_FIELD.UpdatedBy
  // SYSTEM_FIELD.Sprint,
  // SYSTEM_FIELD.ItemType,
  // SYSTEM_FIELD.UpdatedAt,
  SYSTEM_FIELD.CreatedBy,
  SYSTEM_FIELD.CreatedAt,
  SYSTEM_FIELD.Key,
  SYSTEM_FIELD.Name,
  SYSTEM_FIELD.Status,
  SYSTEM_FIELD.Version,
  SYSTEM_FIELD.Priority,
  SYSTEM_FIELD.Assignee,
  SYSTEM_FIELD.Workspace,
] as const;
/** 获取空间界面方案自定义字段 keys */
export const useUsedScreenFieldKeys = (
  workspaceKey: string,
  itemTypeKey: string,
  systemFieldKeys = SystemFieldKeys,
) => {
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
        .then(item => item.toJSON());

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
          itemTypeKeyScreenSchemeMapping[itemType.key] = getScreenIdByScreenScheme(screenScheme);
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
      refreshDeps: [workspaceKey],
      cacheKey: `ItemTypeUsedFieldKey_${workspaceKey}`,
    },
  );

  return React.useMemo(() => {
    return [].concat(
      systemFieldKeys,
      itemUsedFieldKeyMapping?.[itemTypeKey] ?? itemUsedFieldKeyMapping?.default ?? [],
    );
  }, [itemUsedFieldKeyMapping, itemTypeKey, systemFieldKeys]);
};
