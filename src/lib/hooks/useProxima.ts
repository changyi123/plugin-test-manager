import React from 'react';
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
