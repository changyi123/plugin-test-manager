declare module 'insight';
declare module 'proxima-sdk/components/Components/Common' {
  export { FormField, DebounceSelect, OverflowTooltip, addErrorMessage, ColumnsSettings };
}

declare module 'proxima-sdk/hooks/Hooks' {
  export { useI18n, useToken };
}

declare module 'proxima-sdk/lib/Parse';
declare module 'proxima-sdk/schema/models';
declare module 'proxima-sdk/schema/modelType' {
  export { CustomField };
}

declare module 'proxima-event';
declare module 'proxima-sdk/lib/Date';
declare module 'proxima-sdk/lib/Iql';

declare module 'proxima-sdk/lib/Path';
declare module 'proxima-sdk/lib/types/iql' {
  export { IQLParams };
}
declare module 'proxima-sdk/hooks/useParseQuery';
declare module 'proxima-sdk/hooks/useFields';
declare module 'proxima-sdk/lib/Fetch';
declare module 'proxima-sdk/lib/I18n';
declare module 'proxima-sdk/lib/Storage';
declare module 'proxima-sdk/lib/Global';
declare module 'proxima-sdk/schema/types/models' {
  export { CustomField, Workspace };
}
declare module 'proxima-sdk/lib/Dayjs';
declare module 'proxima-sdk/lib/getPackageLocale';
declare module 'proxima-sdk/schema/types/error' {
  export { FormError };
}
declare module 'proxima-sdk/components/Components/Icons';

declare module 'proxima-sdk/components/Components/Chart' {
  export { DropdownInput, FilterQuery, NoData, useQueryFields, useItemListColumns };
}
