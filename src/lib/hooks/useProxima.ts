import React from 'react';
import Parse from '@/lib/parse';
import { Workspace } from '@/lib/models';
import { SYSTEM_FIELD } from '@/lib/constants';

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
