import React from 'react';
import { useRequest } from 'ahooks';
import { get, isEmpty } from 'lodash';
import { getLinkedTestEntityByQuery, getTestEntityByQuery } from '@/lib/api/item';
import { SearchSelectors } from '@/lib/utils/iql';
import { TestLinkType, TestType } from 'common/constant';
import { RepositoryModel } from '@/lib/constants';

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
  selectors?: SearchSelectors;
};
/** 获取测试用例范围 */
export const useScopedTestDetailIds = (params: ScopedTestDetailIdsParams) => {
  const { workspaceKey, testPlanId, testExecutionId, type, selectors } = params;
  return useRequest(
    async () => {
      if (type === 'Plan') {
        // 测试全部用例的范围
        const { list: caseIds } = await getLinkedTestEntityByQuery({
          query: {
            workspaceKey: workspaceKey,
          },
          limit: 9999,
          linkType: TestLinkType.CaseLinkPlan,
          sourceIds: [testPlanId],
          destinationType: TestType.Case,
          onlySelectId: true,
        });

        return caseIds;
      } else if (type === 'Execution') {
        if (!testExecutionId) return [];
        const [systemSelectors, customSelector] = selectors;

        const runSelector = Object.entries(customSelector ?? {}).reduce(
          (prev, [key, value]: any) => {
            if (!key.includes('test_') || key === RepositoryModel) {
              prev[key] = value;
            }
            return prev;
          },
          {},
        );
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

        const ids = runs?.map(run => get(run, 'referenceCase')) ?? [];

        const { list: caseIds } = !isEmpty(systemSelectors)
          ? await getTestEntityByQuery({
              query: {
                workspaceKey: workspaceKey,
                id: ids,
                type: TestType.Case,
              },
              limit: 9999,
              onlySelectId: true,
              selector: [systemSelectors, runSelector],
            })
          : { list: ids };

        return caseIds;
      }
    },
    {
      ready: Boolean(workspaceKey && (testPlanId ?? testExecutionId)),
      refreshDeps: [workspaceKey, testPlanId, testExecutionId, type],
    },
  );
};
