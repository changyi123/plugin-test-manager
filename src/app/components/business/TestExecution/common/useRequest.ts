import React, { useEffect, useMemo, useState } from 'react';

import { getLinkedTestEntityByQuery, getTestEntityByQuery } from '@/lib/api/item';
import { TestLinkType, TestType } from '@/lib/constants';
import useI18n from '@/lib/hooks/useI18n';
import { usePageContext } from '@/pages/plan/hook';

const useRequest = () => {
  const { t } = useI18n();
  const { workspaceKey, selectedTestPlan } = usePageContext();
  const [testPlanList, setTestPlanList] = useState([]);
  const [selectedTestPlanIds, setSelectedTestPlanIds] = useState([]);
  const [selectedExecutionIds, setSelectedExecutionIds] = useState([]);
  const [executionList, setExecutionList] = useState([]);
  const [planMapExecution, setPlanMapExecution] = useState({});

  // fetch Data
  useEffect(() => {
    const fetchData = async () => {
      const { list: testPlanList } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Plan,
        },
        fields: ['name', 'id'],
        notConcatField: true,
        limit: 99999,
      });
      setTestPlanList(testPlanList);
    };
    fetchData();
  }, [workspaceKey, selectedTestPlan]);
  // init select
  useEffect(() => {
    if (selectedTestPlan?.objectId) {
      setSelectedTestPlanIds([selectedTestPlan.objectId]);
    }
  }, [selectedTestPlan]);
  // select changed
  useEffect(() => {
    const fetchData = async _selectedTestPlanIds => {
      const { list: executionList } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.ExecutionLinkPlan,
        sourceIds: _selectedTestPlanIds,
        destinationType: TestType.Execution,
        fields: ['name', 'id'],
      });
      const _planMapExecution = {};
      executionList.forEach(item => {
        if (!_planMapExecution[item.source[0]]) {
          _planMapExecution[item.source[0]] = [];
        }
        if (item.objectId) _planMapExecution[item.source[0]].push(item.objectId);
      });
      setExecutionList(executionList);
      setPlanMapExecution(_planMapExecution);
    };
    if (selectedTestPlanIds?.length) {
      fetchData(selectedTestPlanIds);
    }
  }, [selectedTestPlanIds, workspaceKey]);
  const [loading, setLoading] = useState(false);
  const loadingRef = React.useRef(false);
  const _executionList = useMemo(() => {
    if (selectedTestPlanIds.length === 0) return [];
    return [
      {
        id: 'all',
        name: t('executionTaskExport.all'),
      },
    ].concat(executionList);
  }, [executionList, t, selectedTestPlanIds]);
  return {
    selectedExecutionIds,
    selectedTestPlanIds,
    loading,
    setSelectedTestPlanIds,
    testPlanList,
    setSelectedExecutionIds,
    _executionList,
    executionList,
    planMapExecution,
    workspaceKey,
  };
};
export default useRequest;
