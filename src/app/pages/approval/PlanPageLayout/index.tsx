import { useUpdateEffect } from 'ahooks';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import PageLayout from '@/components/common/PageLayout';
import BasicPageLayout from '@/components/common/PageLayout/Basic';
import { useTestConfig } from '@/lib/hooks/useContext';
import useI18n from '@/lib/hooks/useI18n';
import TestApprovalList from '@/pages/approval/TestApprovalList';

import { usePageContext } from '../hook';
import Header from './Header';
import {
  useGetApprovalLinkCaseIds,
  useTreeParams,
} from './hooks';
import cx from './index.less';
import Left from './Left';
import Right from './Right';

const PlanPageLayout: React.FC<any> = ({ selectedApproval, setApprovalEntry }) => {
  const {
    workspaceKey,
    selectedTestApproval,
    setSearchParams,
    setSelectedTestApproval,
    setApprovalLinkCaseIds,
  } = usePageContext();
  const { t } = useI18n();
  const { config } = useTestConfig();
  console.log('useTestConfig', config);

  const detailSearchRef = useRef(null);
  const pageLeftRef = useRef(null);
  const [selectNode, setSelectNode] = React.useState<Record<string, any>>({ key: 'root' });

  const [activeType, setActiveType] = useState<'TestApproval'>('TestApproval');

  const [showType, setShowType] = useState('all');

  // 获取关联的全部测试用例 id
  const { data: approvalLinkCaseIds, refreshAsync: approvalLinkCaseIdRefresh } = useGetApprovalLinkCaseIds({
    workspaceKey,
    type: 'TestApproval',
    testApprovalId: selectedApproval?.objectId || selectedTestApproval?.objectId,
  });

  useUpdateEffect(() => {
    setApprovalLinkCaseIds(approvalLinkCaseIds);
  }, [approvalLinkCaseIds]);

  useEffect(() => {
    setSelectedTestApproval(selectedApproval);
  }, [selectedApproval]);

  const treeParams = useTreeParams({
    workspaceKey,
    selectedTestApproval,
  });

  console.log('useTreeParams', treeParams);
  console.log('selectedTestApproval', selectedTestApproval);

  useUpdateEffect(() => {
    if (!selectedTestApproval?.objectId) return;
    detailSearchRef.current?.reset();
    setSearchParams([{}, {}]);
    pageLeftRef.current?.reset();
  }, [selectedTestApproval]);

  const refreshTreeAndScopeTestCase = useCallback(async () => {
    await approvalLinkCaseIdRefresh();
    pageLeftRef.current?.refresh?.();
  }, [activeType, approvalLinkCaseIdRefresh]);

  return (
    <div className={cx('test-approval-page')}>
      {!selectedTestApproval?.objectId ? (
        <BasicPageLayout>
          <TestApprovalList setApprovalEntry={setApprovalEntry} />
        </BasicPageLayout>
      ) : (
        <>
          <PageLayout>
            <PageLayout.Header>
              <Header
                activeType={activeType}
                setActiveType={setActiveType}
              />
            </PageLayout.Header>
            <PageLayout.Left>
              <Left
                actionRef={pageLeftRef}
                treeParams={treeParams}
                activeType={activeType}
                onFolderSelect={node => setSelectNode(node)}
              />
            </PageLayout.Left>
            <PageLayout.Right>
              <Right
                activeType={activeType}
                showType={showType}
                setShowType={setShowType}
                refreshTreeAndScopeTestCase={refreshTreeAndScopeTestCase}
                selectNode={selectNode}
                treeParams={treeParams}
                onFolderSelect={node => setSelectNode(node)}
              />
            </PageLayout.Right>
          </PageLayout>
        </>
      )}
    </div>
  );
};

export default PlanPageLayout;
