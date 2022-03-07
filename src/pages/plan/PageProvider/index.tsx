import React from 'react';
import { noop } from 'lodash';
import { useEventEmitter } from 'ahooks';
import { getDevConfig } from '@/devEnv';
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
  setSearchValue: (searchValue: string) => void;
  selectedTestPlanId: TestPlanEntity['objectId'] | null;
  setSelectedTestPlanId: (id: TestPlanEntity['objectId']) => void;
  mutateTestPlanEvent: EventEmitter<string>;
  tableSelectionToggleEvent: EventEmitter<boolean>;
};

export const PageContext = React.createContext<PageContextType>({
  searchValue: '',
  workspaceKey: '',
  setSearchValue: noop,
  selectedTestPlanId: null,
  setSelectedTestPlanId: noop,
  mutateTestPlanEvent: null,
  tableSelectionToggleEvent: null,
});

const PageProvider: React.FC = ({ children }) => {
  const { context } = useSDK();
  const mutateTestPlanEvent = useEventEmitter<string>();
  const tableSelectionToggleEvent = useEventEmitter<boolean>();
  const [selectedTestPlanId, setSelectedTestPlanId] = React.useState(null);
  const [searchValue, setSearchValue] = React.useState('');
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;

  return (
    <ErrorBoundary>
      <TestManagerProvider workspaceKey={workspaceKey}>
        <PageContext.Provider
          value={{
            searchValue,
            workspaceKey,
            setSearchValue,
            selectedTestPlanId,
            mutateTestPlanEvent,
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
