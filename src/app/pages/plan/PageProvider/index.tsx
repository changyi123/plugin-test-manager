import { useSDK } from '@giteeteam/plugin-sdk';
import { useEventEmitter } from 'ahooks';
import { EventEmitter } from 'ahooks/lib/useEventEmitter';
import { noop } from 'lodash';
import { isEqual } from 'lodash';
import React, { useCallback, useRef, useState } from 'react';

import TestManagerProvider from '@/components/business/TestManagerProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { getDevConfig } from '@/devEnv';
import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { SearchSelectors } from '@/lib/utils/iql';
import { TestExecutionEntity } from '@/pages/plan/type';

export type TableActionEventType = {
  tableSelectionVisible?: boolean;
};

type TestPlanEntity = TestEntity<TestType.Plan> & {
  refTestDetails: TestEntity[];
};

type PageContextType = {
  selectors: SearchSelectors;
  setSearchParams: (data: SearchSelectors) => void;
  searchValue: string;
  workspaceKey: string;
  planLinkCaseIds?: string[];
  executionLinkRunIds?: string[];
  runLinkCaseIds?: string[];
  refresh: (key?: string) => void;
  selectedTestPlan: TestPlanEntity | null;
  selectedTestExecution: TestExecutionEntity | null;
  setSearchValue: (searchValue: string) => void;
  tableSelectionToggleEvent: EventEmitter<boolean>;
  mutateTestPlanEvent: EventEmitter<string | undefined>;
  mutateTestTableList: EventEmitter<string | undefined>;
  mutateStatusEvent: EventEmitter<string | undefined>;
  setSelectedTestPlan: (testPlan: TestPlanEntity | null) => void;
  setSelectedTestExecution: (testPlan: TestExecutionEntity | null) => void;
  registerRefreshMethod: (method: Record<string, () => void>) => void;
  setPlanLinkCaseIds: (val?: string[]) => void;
  setExecutionLinkRunIds: (val?: string[]) => void;
  setRunLinkCaseIds: (val?: string[]) => void;
  setPlanId: (val?: string) => void;
  activeExecutionPlan: TestPlanEntity | null;
  setActiveExecutionPlan: (val: TestPlanEntity | null) => void;
  runLinkSnapshotIds?: string[];
  setRunLinkSnapshotIds?: (val?: string[]) => void;
  runMap?: Record<string, string>;
  runVersionMap?: Record<string, any>;
  setRunMap?: (val?: Record<string, string>) => void;
  runSnapshotMap?: Record<string, string>;
  setRunSnapshotMap?: (val?: Record<string, string>) => void;
  setRunVersionMap?: (val?: Record<string, any>) => void;
};

export const PageContext = React.createContext<PageContextType>({
  selectors: [{}, {}],
  setSearchParams: noop,
  refresh: noop,
  searchValue: '',
  workspaceKey: '',
  setSearchValue: noop,
  mutateTestPlanEvent: null,
  mutateTestTableList: null,
  mutateStatusEvent: null,
  setSelectedTestPlan: noop,
  registerRefreshMethod: noop,
  tableSelectionToggleEvent: null,
  selectedTestPlan: {} as TestPlanEntity,
  selectedTestExecution: {} as TestExecutionEntity,
  planLinkCaseIds: null,
  executionLinkRunIds: null,
  runLinkCaseIds: null,
  setPlanLinkCaseIds: noop,
  setExecutionLinkRunIds: noop,
  setRunLinkCaseIds: noop,
  setPlanId: noop,
  activeExecutionPlan: null,
  setActiveExecutionPlan: noop,
  runLinkSnapshotIds: null,
  setRunLinkSnapshotIds: noop,
  setSelectedTestExecution: noop,
  runVersionMap: null,
  setRunVersionMap: noop,
});

const PageProvider: React.FC<any> = ({ children }) => {
  const { context } = useSDK();
  const refreshCacheRef = useRef<Record<string, () => void>>();
  const [searchValue, setSearchValue] = useState('');
  const [selectors, setSelectors] = useState();
  const [runVersionMap, setRunVersionMap] = useState<Record<string, string>>({});
  const tableSelectionToggleEvent = useEventEmitter<boolean>();
  const mutateTestPlanEvent = useEventEmitter<string | undefined>();
  const mutateStatusEvent = useEventEmitter<string | undefined>();
  const mutateTestTableList = useEventEmitter<string | undefined>();
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;
  const [selectedTestPlan, setSelectedTestPlan] = useState(null);
  const [selectedTestExecution, setSelectedTestExecution] = useState(null);
  const [planLinkCaseIds, setPlanLinkCaseIds] = useState<string[]>(null);
  const [executionLinkRunIds, setExecutionLinkRunIds] = useState<string[]>(null);
  const [runLinkCaseIds, setRunLinkCaseIds] = useState<string[]>(null);
  const [runLinkSnapshotIds, setRunLinkSnapshotIds] = useState<string[]>(null);
  const [runMap, setRunMap] = useState<Record<string, string>>({});
  const [runSnapshotMap, setRunSnapshotMap] = useState<Record<string, string>>({});
  const [activeExecutionPlan, setActiveExecutionPlan] = useState(null);

  const refresh = useCallback(key => {
    if (key) {
      refreshCacheRef.current[key]?.();
    }
    Object.values(refreshCacheRef.current).forEach(method => method?.());
  }, []);

  const setPlanId = useCallback(
    id => {
      setSelectedTestPlan(selectedTestPlan ?? id ? { objectId: id } : null);
    },
    [selectedTestPlan],
  );

  const registerRefreshMethod = React.useCallback(methods => {
    refreshCacheRef.current = {
      ...refreshCacheRef.current,
      ...methods,
    };
  }, []);

  const setSearchParams = useCallback(
    data => {
      if (isEqual(data, selectors)) return;
      setSelectors(data);
    },
    [selectors],
  );

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
            mutateTestTableList,
            mutateStatusEvent,
            registerRefreshMethod,
            tableSelectionToggleEvent,
            planLinkCaseIds,
            executionLinkRunIds,
            runLinkCaseIds,
            setPlanLinkCaseIds,
            setExecutionLinkRunIds,
            setRunLinkCaseIds,
            setPlanId,
            activeExecutionPlan,
            setActiveExecutionPlan,
            runLinkSnapshotIds,
            setRunLinkSnapshotIds,
            runMap,
            setRunMap,
            runSnapshotMap,
            setRunSnapshotMap,
            selectedTestExecution,
            setSelectedTestExecution,
            runVersionMap,
            setRunVersionMap,
          }}
        >
          {children}
        </PageContext.Provider>
      </TestManagerProvider>
    </ErrorBoundary>
  );
};

export default PageProvider;
