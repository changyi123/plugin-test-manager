import { ArrowLeftOutlined } from '@ant-design/icons';
import { useListener } from '@projectproxima/proxima-sdk-js';
import { useUpdateEffect } from 'ahooks';
import { Space } from 'antd';
import React, { memo, useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import TestEntitySelectorModal, {
  ActionType as ModelActionType,
} from '@/components/business/TestEntitySelectorModal';
import PageLayout from '@/components/common/PageLayout';
import BasicPageLayout from '@/components/common/PageLayout/Basic';
import { PROXIMA_EVENT_KEY, TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { useTreeParams } from '@/pages/caseset/components/CaseSetPageLayout/hooks';
import { usePageContext } from '@/pages/caseset/components/hook';

import TestCaseSetList from '../TestCaseSetList';
import Header from './Header';
import cx from './index.less';
import Left from './Left';
import Right from './Right';

type ExecutionListRef = {
  refresh?: () => void;
};
const CaseSetPageLayout: React.FC<any> = () => {
  const { workspaceKey, selectedTestCaseSet, setSearchParams } = usePageContext();
  const { t } = useI18n();
  const executionListRef = React.useRef<ExecutionListRef>();
  const pageLeftRef = useRef(null);
  // ,
  const testEntitySelectorRef = React.useRef<ModelActionType>();
  const [selectValue, setSelectValue] = useState<string[] | undefined>(undefined);
  const [treeType, setTreeType] = React.useState<string | undefined>('repository');
  const [selectNode, setSelectNode] = React.useState<Record<string, any>>(null);
  const { setTestCaseSet } = usePageContext();

  const [activeType, setActiveType] = useState<'TestPlan' | 'TestExecution' | 'TestCaseSet'>(
    'TestCaseSet',
  );

  const [showType, setShowType] = useState('all');

  const { query } = useLocation();

  // todo 需要确认是否需要
  useUpdateEffect(() => {
    if (query?.actionType && !activeType) {
      setActiveType(query?.actionType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.actionType]);

  const treeParams = useTreeParams({
    workspaceKey,
    selectedTestCaseSet: selectedTestCaseSet,
  });

  useUpdateEffect(() => {
    if (!selectedTestCaseSet?.objectId) return;
    setSearchParams([{}, {}]);
    pageLeftRef.current?.reset();
  }, [activeType, selectedTestCaseSet]);

  const refreshTreeAndScopeTestCase = useCallback(async () => {
    // await scopeTestRunIdsRefresh();
    pageLeftRef.current.refresh?.();
  }, []);

  const refresh = useCallback(
    (props = {} as any) => {
      setSelectValue([]);
      setTreeType('repository');
      if (!props?.itemIdList?.length) {
        executionListRef?.current?.refresh();
      }
    },
    [executionListRef],
  );
  // useListener('CreateItemModalPrev', cancelCallback);
  useListener(PROXIMA_EVENT_KEY.itemBatchCreateSuccess, props => {
    refresh(props);
  });

  return (
    <div className={cx('test-plan-page')}>
      {!selectedTestCaseSet?.objectId ? (
        <BasicPageLayout>
          <TestCaseSetList listRef={executionListRef} />
        </BasicPageLayout>
      ) : (
        <>
          <PageLayout>
            <PageLayout.Header>
              <Header />
            </PageLayout.Header>
            <PageLayout.Left>
              <Left
                actionRef={pageLeftRef}
                treeParams={treeParams}
                onFolderSelect={node => setSelectNode(node)}
              />
            </PageLayout.Left>
            <PageLayout.Right>
              <Right
                showRepoDropDown={false}
                activeType="TestExecution"
                showType={showType}
                setShowType={setShowType}
                refreshTreeAndScopeTestCase={refreshTreeAndScopeTestCase}
                selectNode={selectNode}
              />
            </PageLayout.Right>
          </PageLayout>
        </>
      )}
      <TestEntitySelectorModal
        title={t('page.plan.planPageLayout.right.caseSelectModelTitle')}
        showDefaultRange
        testType={TestType.Case}
        actionRef={testEntitySelectorRef}
        caseSetId={selectedTestCaseSet?.objectId}
        isPlanForTestSet={true}
        onCancel={() => {
          refresh();
        }}
        afterClose={() => {
          refresh();
        }}
      />
    </div>
  );
};

CaseSetPageLayout.displayName = 'CaseSetPageLayout';
export default memo(CaseSetPageLayout);
