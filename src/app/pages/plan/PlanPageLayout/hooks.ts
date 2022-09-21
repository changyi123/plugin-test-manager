import React from 'react';
import { useRequest } from 'ahooks';
import { get } from 'lodash';
import { getlinkedTestEntityByQuery } from '@/lib/api/item';
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

type ScopedTestDetailIdsParams = {
  /** 所属空间 */
  workspaceKey: string;
  /** 所选测试计划 id */
  testPlanId?: string;
  /** 测试执行 id */
  testExecutionId?: string;
  /** 获取类型 */
  type: 'Execution' | 'Plan';
};
/** 获取测试用例范围 */
export const useScopedTestDetailIds = (params: ScopedTestDetailIdsParams) => {
  const { workspaceKey, testPlanId, testExecutionId, type } = params;
  return useRequest(
    async () => {
      if (type === 'Plan') {
        // 测试全部用例的范围
        const { list: details } = await getlinkedTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
          },
          limit: 9999,
          linkType: TestLinkType.CaseLinkPlan,
          sourceIds: [testPlanId],
          destinationType: TestType.Case,
        });

        return details?.map(detail => get(detail, 'objectId')) ?? [];
      } else if (type === 'Execution') {
        // 测试执行的用例范围
        const { list: runs } = await getlinkedTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
          },
          limit: 9999,
          linkType: TestLinkType.RunLinkExecution,
          sourceIds: [testExecutionId],
          destinationType: TestType.Run,
        });

        return runs?.map(run => get(run, 'referenceCase')) ?? [];
      }
    },
    {
      ready: Boolean(workspaceKey && (testPlanId ?? testExecutionId)),
      refreshDeps: [workspaceKey, testPlanId, testExecutionId, type],
    },
  );
};
