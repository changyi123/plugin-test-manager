import React from 'react';
import { noop } from 'lodash';
import { getDevConfig } from '@/devEnv';
import { useEventEmitter } from 'ahooks';
import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { useSDK } from '@projectproxima/plugin-sdk';
import { EventEmitter } from 'ahooks/lib/useEventEmitter';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TestManagerProvider from '@/components/common/TestManagerProvider';

export type TableActionEventType = {
  tableSelectionVisible?: boolean;
};

type TestPlanEntity = TestEntity<TestType.TestPlan>;

type PageContextType = {
  searchValue: string;
  workspaceKey: string;
  refresh: (key?: string) => void;
  setSearchValue: (searchValue: string) => void;
  tableSelectionToggleEvent: EventEmitter<boolean>;
  mutateTestPlanEvent: EventEmitter<string | undefined>;
  selectedTestPlanId: TestPlanEntity['objectId'] | null;
  setSelectedTestPlanId: (id: TestPlanEntity['objectId']) => void;
  registerRefreshMethod: (method: Record<string, () => void>) => void;
};

export const PageContext = React.createContext<PageContextType>({
  refresh: noop,
  searchValue: '',
  workspaceKey: '',
  setSearchValue: noop,
  selectedTestPlanId: null,
  mutateTestPlanEvent: null,
  setSelectedTestPlanId: noop,
  registerRefreshMethod: noop,
  tableSelectionToggleEvent: null,
});

const PageProvider: React.FC = ({ children }) => {
  const { context } = useSDK();
  const [searchValue, setSearchValue] = React.useState('');
  const tableSelectionToggleEvent = useEventEmitter<boolean>();
  const mutateTestPlanEvent = useEventEmitter<string | undefined>();
  const refreshCacheRef = React.useRef<Record<string, () => void>>();
  const [selectedTestPlanId, setSelectedTestPlanId] = React.useState(null);
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;

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

  return (
    <ErrorBoundary>
      <TestManagerProvider workspaceKey={workspaceKey}>
        <PageContext.Provider
          value={{
            refresh,
            searchValue,
            workspaceKey,
            setSearchValue,
            selectedTestPlanId,
            mutateTestPlanEvent,
            registerRefreshMethod,
            setSelectedTestPlanId,
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
