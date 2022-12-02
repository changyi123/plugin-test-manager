import { ICLUDE_SYSTEM_FIELD, SystemIncludeFieldKeys, SYSTEM_FIELD } from '@/lib/constants';

export const getFilterFields = fields => {
  const systemFields = Object.values(SYSTEM_FIELD).filter(
    field => !SystemIncludeFieldKeys.includes(field),
  );
  return fields?.filter(
    field => !systemFields.includes(field) || ICLUDE_SYSTEM_FIELD.includes(field),
  );
};
