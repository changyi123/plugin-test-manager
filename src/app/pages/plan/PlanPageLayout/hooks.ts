import React from 'react';
import { useRequest } from 'ahooks';
import { getCasesByStatus, getLinkedTestEntityByQuery, getTestEntityByQuery } from '@/lib/api/item';
import {
  getTestCaseStatusModelValue,
  handleCustomerSelector,
  SearchSelectors,
} from '@/lib/utils/iql';
import { TestLinkType, TestType } from 'common/constant';
import { getRepositoryQuery } from '@/lib/utils/tree';
import { isEmpty, omit } from 'lodash';
import { TestCaseStatusModel, TestRunDesigneeModel, TestRunExecutorModel } from '@/lib/constants';
import { getTestRunSelector } from './helps';

export const useResizeContainerDOM = (objectId?: string) => {
  React.useEffect(() => {
    const layoutElement = document.querySelector('[data-element-id="workspace.layout.content"]');
    if (layoutElement && !objectId) {
      const workspacePluginContainerDOM = layoutElement.children?.[0] ?? ({} as any);
      workspacePluginContainerDOM.style = `padding: 0`;
    }
  }, [objectId]);
};

type ScopedTestRunIds = {
  executionLinkRunIds: string[];
  runLinkCaseIds: string[];
};

type ScopedTestDetailIdsParams = {
  /** 所属空间 */
  workspaceKey: string;
  /** 所选测试计划 id */
  testPlanId?: string;
  /** 测试执行 id */
  testExecutionId?: string;
  /** 获取类型 */
  type: 'TestExecution' | 'TestPlan';
  selectors?: SearchSelectors;
  selectedNode?: any;
  planLinkCaseIds?: string[];
};

export const useGetPlanLinkCaseIds = (params: ScopedTestDetailIdsParams) => {
  const { workspaceKey, testPlanId, type } = params;
  return useRequest(
    async () => {
      if (!workspaceKey || !testPlanId) return {};
      // 测试全部用例 ID
      const { list: caseIds } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
        },
        limit: 9999,
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [testPlanId],
        destinationType: TestType.Case,
        onlySelectId: true,
      });

      return caseIds;
    },
    {
      ready: Boolean(workspaceKey && testPlanId),
      refreshDeps: [testPlanId, workspaceKey, type],
      cacheTime: 99999,
      staleTime: 99999,
    },
  );
};

export const useGetFilterPlanLinkCaseIds = props => {
  const { workspaceKey, id, planId, type, selectNode, selectors } = props;
  return useRequest(
    async () => {
      if (!workspaceKey || !id) return [];
      if (type !== 'TestPlan') return [];
      if (!selectNode?.key) return id;
      if (selectNode?.key === 'root' && isEmpty(selectors?.[0]) && isEmpty(selectors?.[1]))
        return id;
      const query: Record<string, any> = {};
      const { selector, runStatusSelector } = handleCustomerSelector(selectors);
      if (runStatusSelector[TestCaseStatusModel]?.value?.length) {
        const params = getTestCaseStatusModelValue(runStatusSelector);
        const { data: ids } = await getCasesByStatus({
          planId,
          ...params,
        });
        query.id = ids;
      }
      const repository = getRepositoryQuery(selectNode, 'all');
      // 测试全部用例 ID
      const { list: caseIds } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
          id,
          ...repository,
          ...query,
        },
        limit: 9999,
        selector,
        onlySelectId: true,
      });

      return caseIds;
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [workspaceKey, id, type, selectNode, selectors],
      cacheTime: 99999,
      staleTime: 99999,
    },
  );
};

export const useGetExecutionLinkCaseRunIds = (params: ScopedTestDetailIdsParams) => {
  const { workspaceKey, testExecutionId, type } = params;
  return useRequest(
    async () => {
      if (!testExecutionId || type !== 'TestExecution') return {} as ScopedTestRunIds;

      // 测试执行的用例范围
      const { list: runs } = await getLinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.RunLinkExecution,
        sourceIds: [testExecutionId],
        destinationType: TestType.Run,
        select: ['id', 'referenceCase'],
      });
      const runMap = new Map();
      runs.forEach(run => {
        runMap.set(run.id, run.referenceCase);
      });

      return {
        executionLinkRunIds: [...runMap.keys()],
        runLinkCaseIds: [...runMap.values()],
      };
    },
    {
      ready: Boolean(workspaceKey && testExecutionId),
      refreshDeps: [testExecutionId, type],
    },
  );
};

export const useGetFilterExecutionLinkCaseRunIds = props => {
  const { workspaceKey, runId, runLinkCaseId, type, executionId, selectNode, selectors } = props;
  // 先查询 testRun 再查询 testCase
  const getTableDataByFilterRun = async params => {
    const { id, workspaceKey, filterRunSelector, selectNode, selector } = params;

    const { list: runs } = await getTestEntityByQuery({
      query: {
        workspaceKey,
        type: TestType.Run,
        id,
      },
      limit: 9999,
      select: ['id', 'referenceCase'],
      selector: [{}, filterRunSelector],
    });

    const runCaseMap = new Map();
    runs.forEach(d => {
      runCaseMap.set(d.referenceCase, d);
    });
    const repository = getRepositoryQuery(selectNode, 'all');

    const { list: caseIds } = await getTestEntityByQuery({
      query: {
        workspaceKey: workspaceKey,
        type: TestType.Case,
        id: [...runCaseMap.keys()],
        ...repository,
      },
      limit: 9999,
      selector,
      onlySelectId: true,
    });

    return caseIds.map(d => runCaseMap.get(d)?.id) ?? [];
  };

  const getTableDataByFilterCase = async params => {
    const { ids, workspaceKey, selectNode, executionId, selector } = params;

    const repository = getRepositoryQuery(selectNode, 'all');

    const { list: caseIds } = await getTestEntityByQuery({
      query: {
        workspaceKey,
        type: TestType.Case,
        id: ids,
        ...repository,
      },
      limit: 9999,
      selector,
      onlySelectId: true,
    });
    const { list: runId } = await getLinkedTestEntityByQuery({
      query: {
        workspaceKey: workspaceKey,
        referenceCase: caseIds,
      },
      linkType: TestLinkType.RunLinkExecution,
      sourceIds: [executionId],
      destinationType: TestType.Run,
      onlySelectId: true,
    });

    return runId;
  };

  return useRequest(
    async () => {
      if (!workspaceKey || !runId) return [];
      if (type === 'TestPlan') return [];
      if (!selectNode?.key) return runId;
      if (selectNode?.key === 'root' && isEmpty(selectors?.[0]) && isEmpty(selectors?.[1]))
        return runId;
      const [systemSelectors, customSelector] = selectors;
      const filterCaseSelector = omit(customSelector, [
        TestRunDesigneeModel,
        TestRunExecutorModel,
        TestCaseStatusModel,
      ]);
      const filterRunSelector = getTestRunSelector(customSelector);

      if (filterRunSelector) {
        return await getTableDataByFilterRun({
          workspaceKey,
          id: runId,
          filterRunSelector,
          selector: [systemSelectors, filterCaseSelector],
          selectNode,
        });
      }

      return await getTableDataByFilterCase({
        workspaceKey,
        ids: runLinkCaseId,
        executionId,
        selector: [systemSelectors, filterCaseSelector],
        selectNode,
      });
    },
    {
      ready: Boolean(workspaceKey),
      refreshDeps: [workspaceKey, runId, runLinkCaseId, type, executionId, selectNode, selectors],
    },
  );
};
