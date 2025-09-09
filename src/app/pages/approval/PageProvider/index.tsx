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
import { TestExecutionEntity } from '@/pages/approval/type';

export type TableActionEventType = {
  tableSelectionVisible?: boolean;
};

type TestApprovalEntity = TestEntity<TestType.Plan> & {
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
  selectedTestApproval: TestApprovalEntity | null;
  selectedTestExecution: TestExecutionEntity | null;
  setSearchValue: (searchValue: string) => void;
  tableSelectionToggleEvent: EventEmitter<boolean>;
  mutateTestPlanEvent: EventEmitter<string | undefined>;
  mutateTestTableList: EventEmitter<string | undefined>;
  mutateStatusEvent: EventEmitter<string | undefined>;
  setSelectedTestApproval: (testPlan: TestApprovalEntity | null) => void;
  setSelectedTestExecution: (testPlan: TestExecutionEntity | null) => void;
  registerRefreshMethod: (method: Record<string, () => void>) => void;
  setPlanLinkCaseIds: (val?: string[]) => void;
  setExecutionLinkRunIds: (val?: string[]) => void;
  setRunLinkCaseIds: (val?: string[]) => void;
  setApprovalId: (val?: string) => void;
  activeExecutionPlan: TestApprovalEntity | null;
  setActiveExecutionPlan: (val: TestApprovalEntity | null) => void;
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
  setSelectedTestApproval: noop,
  registerRefreshMethod: noop,
  tableSelectionToggleEvent: null,
  selectedTestApproval: {} as TestApprovalEntity,
  selectedTestExecution: {} as TestExecutionEntity,
  planLinkCaseIds: null,
  executionLinkRunIds: null,
  runLinkCaseIds: null,
  setPlanLinkCaseIds: noop,
  setExecutionLinkRunIds: noop,
  setRunLinkCaseIds: noop,
  setApprovalId: noop,
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
  const [selectedTestApproval, setSelectedTestApproval] = useState(null);
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

  const setApprovalId = useCallback(
    id => {
      setSelectedTestApproval(selectedTestApproval ?? id ? { objectId: id } : null);
    },
    [selectedTestApproval],
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
            selectedTestApproval,
            setSelectedTestApproval,
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
            setApprovalId,
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
