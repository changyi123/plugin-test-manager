import {
  DATA_FIELDS,
  ICLUDE_SYSTEM_FIELD,
  SYSTEM_FIELD,
  SystemIncludeFieldKeys,
} from '@/lib/constants';

export const getFilterFields = fields => {
  const systemFields = Object.values(SYSTEM_FIELD).filter(
    field => !SystemIncludeFieldKeys.includes(field),
  );
  return fields?.filter(
    field => field && (!systemFields.includes(field) || ICLUDE_SYSTEM_FIELD.includes(field)),
  );
};

export const handleDataSelector = selector => {
  const getDataFiledValue = itemValue =>
    Array.isArray(itemValue)
      ? itemValue?.filter(Boolean)?.length
        ? itemValue
        : []
      : itemValue ?? [];

  return Object.entries(selector).reduce((prev, [fieldKey, fieldValue]: any[]) => {
    if (DATA_FIELDS.includes((fieldValue as any)?.component)) {
      prev[fieldKey] = {
        ...fieldValue,
        value: getDataFiledValue(fieldValue.value),
      };
    } else {
      prev[fieldKey] = fieldValue;
    }
    return prev;
  }, {});
};
