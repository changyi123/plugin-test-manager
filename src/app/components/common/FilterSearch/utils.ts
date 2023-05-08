import { ICLUDE_SYSTEM_FIELD, SYSTEM_FIELD, SystemIncludeFieldKeys } from '@/lib/constants';

export const getFilterFields = fields => {
  const systemFields = Object.values(SYSTEM_FIELD).filter(
    field => !SystemIncludeFieldKeys.includes(field),
  );
  return fields?.filter(
    field => field && (!systemFields.includes(field) || ICLUDE_SYSTEM_FIELD.includes(field)),
  );
};
