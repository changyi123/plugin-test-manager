import React, { useCallback } from 'react';
import { noop } from 'lodash';
import { getDevConfig } from '@/devEnv';
import { useEventEmitter } from 'ahooks';
import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { useSDK } from '@projectproxima/plugin-sdk';
import { EventEmitter } from 'ahooks/lib/useEventEmitter';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TestManagerProvider from '@/components/business/TestManagerProvider';
import { SearchSelectors } from '@/lib/utils/iql';

export type TableActionEventType = {
  tableSelectionVisible?: boolean;
};

type TestPlanEntity = TestEntity<TestType.TestPlan> & {
  refTestDetails: TestEntity[];
};

type PageContextType = {
  selectors: SearchSelectors;
  setSearchParams: (data: SearchSelectors) => void;
  searchValue: string;
  workspaceKey: string;
  refresh: (key?: string) => void;
  selectedTestPlan: TestPlanEntity | null;
  setSearchValue: (searchValue: string) => void;
  tableSelectionToggleEvent: EventEmitter<boolean>;
  mutateTestPlanEvent: EventEmitter<string | undefined>;
  setSelectedTestPlan: (testPlan: TestPlanEntity | null) => void;
  registerRefreshMethod: (method: Record<string, () => void>) => void;
};

export const PageContext = React.createContext<PageContextType>({
  selectors: [{}, {}],
  setSearchParams: noop,
  refresh: noop,
  searchValue: '',
  workspaceKey: '',
  setSearchValue: noop,
  mutateTestPlanEvent: null,
  setSelectedTestPlan: noop,
  registerRefreshMethod: noop,
  tableSelectionToggleEvent: null,
  selectedTestPlan: {} as TestPlanEntity,
});

const PageProvider: React.FC = ({ children }) => {
  const { context } = useSDK();
  const [searchValue, setSearchValue] = React.useState('');
  const [selectors, setSelectors] = React.useState();
  const tableSelectionToggleEvent = useEventEmitter<boolean>();
  const mutateTestPlanEvent = useEventEmitter<string | undefined>();
  const refreshCacheRef = React.useRef<Record<string, () => void>>();
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;
  const [selectedTestPlan, setSelectedTestPlan] = React.useState(null);

  const refresh = React.useCallback(key => {
    if (key) {
      refreshCacheRef.current[key]?.();
    }
    Object.values(refreshCacheRef.current).forEach(method => method?.());
  }, []);

  const registerRefreshMethod = React.useCallback(methods => {
    refreshCacheRef.current = {
      ...refreshCacheRef.current,
      ...methods,
    };
  }, []);

  const setSearchParams = useCallback(data => {
    setSelectors(data);
  }, []);

  return (
    <ErrorBoundary>
      <TestManagerProvider workspaceKey={workspaceKey}>
        <PageContext.Provider
          value={{
            selectors,
            setSearchParams,
            refresh,
            searchValue,
            workspaceKey,
            setSearchValue,
            selectedTestPlan,
            setSelectedTestPlan,
            mutateTestPlanEvent,
            registerRefreshMethod,
            tableSelectionToggleEvent,
          }}
        >
          {children}
        </PageContext.Provider>
      </TestManagerProvider>
    </ErrorBoundary>
  );
};

export default PageProvider;
