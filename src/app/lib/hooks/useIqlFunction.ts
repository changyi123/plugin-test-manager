import { useEffect, useMemo, useState } from 'react';

import { getIqlFunction } from '../api/common';
import { getTenantKey } from '../utils/helper';
import {
  buildIqlFunctionFilter,
  getTargetIqlFunctionFilter,
  IQL_FUNCTION_ENUM,
  IqlFunctionFilterType,
} from '../utils/iqlFunction';

const emptyArr = [];

type UseIqlFunctionType = ({ workspaceKey }: { workspaceKey: string }) => IqlFunctionFilterType[];

export const useIqlFunctionFilter: UseIqlFunctionType = ({ workspaceKey }) => {
  const [iqlFunctionFilters, setIqlFunctionFilters] = useState<IqlFunctionFilterType[]>(emptyArr);
  useEffect(() => {
    const query = async () => {
      const list = await getIqlFunction({ workspaceKey, applicationId: getTenantKey() });
      setIqlFunctionFilters(buildIqlFunctionFilter(list));
    };

    query();
  }, [workspaceKey]);

  return iqlFunctionFilters;
};

export const useTestExecutionIqlFunctionFilter: UseIqlFunctionType = ({ workspaceKey }) => {
  const iqlFunctionFilters = useIqlFunctionFilter({ workspaceKey });

  const executionIqlFunctionFilters = useMemo(() => {
    return getTargetIqlFunctionFilter(iqlFunctionFilters, IQL_FUNCTION_ENUM.testExecutionCases);
  }, [iqlFunctionFilters]);

  return executionIqlFunctionFilters;
};

export const useTestCaseIqlFunctionFilter: UseIqlFunctionType = ({ workspaceKey }) => {
  const iqlFunctionFilters = useIqlFunctionFilter({ workspaceKey });

  const executionIqlFunctionFilters = useMemo(() => {
    return getTargetIqlFunctionFilter(iqlFunctionFilters, IQL_FUNCTION_ENUM.testCaseExecutions);
  }, [iqlFunctionFilters]);

  return executionIqlFunctionFilters;
};
