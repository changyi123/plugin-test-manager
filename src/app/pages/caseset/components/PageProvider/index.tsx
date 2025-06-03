import { useSDK } from '@projectproxima/plugin-sdk';
import { useEventEmitter } from 'ahooks';
import { EventEmitter } from 'ahooks/lib/useEventEmitter';
import { noop } from 'lodash';
import { isEqual } from 'lodash';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import TestManagerProvider from '@/components/business/TestManagerProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { getDevConfig } from '@/devEnv';
import { TestType } from '@/lib/constants';
import { TestEntity } from '@/lib/types/Test';
import { SearchSelectors } from '@/lib/utils/iql';

//  todo  这个文件需要精简
type TestCaseSetEntity = TestEntity<TestType.CaseSet> & {
  refTestDetails: TestEntity[];
};

type PageContextType = {
  selectors: SearchSelectors;
  setSearchParams: (data: SearchSelectors) => void;
  searchValue: string;
  workspaceKey: string;
  refresh: (key?: string) => void;
  setSearchValue: (searchValue: string) => void;
  registerRefreshMethod: (method: Record<string, () => void>) => void;
  selectedTestCaseSet: TestCaseSetEntity | null;
  selectedTestCaseSetId: string | null;
  setTestCaseSetId: (val?: string) => void; // todo  需要确认是需要id 还是对象
  setTestCaseSet: (val?: string) => void; // todo  需要确认是需要id 还是对象
  runLinkSnapshotIds?: string[];
  setRunLinkSnapshotIds?: (val?: string[]) => void;
  tableSelectionToggleEvent: EventEmitter<boolean>;
  mutateTestTableList: EventEmitter<string | undefined>;
  mutateStatusEvent: EventEmitter<string | undefined>;
};

export const PageContext = React.createContext<PageContextType>({
  tableSelectionToggleEvent: undefined,
  selectors: [{}, {}],
  selectedTestCaseSet: null,
  selectedTestCaseSetId: null,
  setTestCaseSetId: noop,
  setTestCaseSet: noop,
  setSearchParams: noop,
  mutateTestTableList: null,
  mutateStatusEvent: null,
  refresh: noop,
  searchValue: '',
  workspaceKey: '',
  setSearchValue: noop,
  registerRefreshMethod: noop,
  runLinkSnapshotIds: null,
  setRunLinkSnapshotIds: noop,
});

const PageProvider: React.FC<any> = ({ children }) => {
  const { context } = useSDK();
  const refreshCacheRef = useRef<Record<string, () => void>>();
  const [searchValue, setSearchValue] = useState('');
  const [selectors, setSelectors] = useState();
  const tableSelectionToggleEvent = useEventEmitter<boolean>();
  const mutateStatusEvent = useEventEmitter<string | undefined>();
  const mutateTestTableList = useEventEmitter<string | undefined>();
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;
  const [selectedTestCaseSet, setTestCaseSet] = useState(null);
  const [runLinkSnapshotIds, setRunLinkSnapshotIds] = useState<string[]>(null);

  const selectedTestCaseSetId = useMemo(() => {
    return selectedTestCaseSet?.objectId;
  }, [selectedTestCaseSet]);
  const refresh = useCallback(key => {
    if (key) {
      refreshCacheRef.current[key]?.();
    }
    Object.values(refreshCacheRef.current).forEach(method => method?.());
  }, []);

  const setTestCaseSetId = useCallback(
    id => {
      setTestCaseSet(selectedTestCaseSet ?? id ? { objectId: id } : null);
    },
    [selectedTestCaseSet],
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
            mutateTestTableList,
            mutateStatusEvent,
            registerRefreshMethod,
            tableSelectionToggleEvent,
            selectedTestCaseSet,
            selectedTestCaseSetId,
            setTestCaseSetId,
            setTestCaseSet,
            runLinkSnapshotIds,
            setRunLinkSnapshotIds,
          }}
        >
          {children}
        </PageContext.Provider>
      </TestManagerProvider>
    </ErrorBoundary>
  );
};

export default PageProvider;
