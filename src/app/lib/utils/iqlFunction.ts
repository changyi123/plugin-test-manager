export enum IQL_FUNCTION_ENUM {
  testCaseExecutions = 'testCaseExecutions',
  testExecutionCases = 'testExecutionCases',
}

export type IqlFunctionFilterType = {
  plugin: any;
  name: string;
  objectId: string;
  key: string;
  functionName: string;
};

export const getTargetIqlFunctionFilter = (
  iqlFunctionFilters: IqlFunctionFilterType[],
  type: IQL_FUNCTION_ENUM,
): IqlFunctionFilterType[] => {
  return iqlFunctionFilters.filter(iqlFunctionFilter => iqlFunctionFilter.functionName === type);
};

export const buildIqlFunctionFilter = (iqlFunctionFilters: any): IqlFunctionFilterType[] => {
  return iqlFunctionFilters.map(iqlFunctionFilter => ({
    plugin: iqlFunctionFilter,
    name: iqlFunctionFilter.title,
    functionName: iqlFunctionFilter.name,
    objectId: iqlFunctionFilter.key,
    key: iqlFunctionFilter.key,
  }));
};
