import React from 'react';
import { useRequest } from 'ahooks';
import { getLinkedTestEntityByQuery } from '@/lib/api/item';
import { SearchSelectors } from '@/lib/utils/iql';
import { TestLinkType, TestType } from 'common/constant';

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
      cacheKey: `${workspaceKey}_${testPlanId}_caseIds`,
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
