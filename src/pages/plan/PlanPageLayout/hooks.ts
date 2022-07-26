import React from 'react';
import { get } from 'lodash';
import { Test } from '@/lib/models';
import { TestRelationType } from '@/lib/constants';
import { getTestEntitiesByRelationWithOrder } from '@/lib/api/common';
import { useRequest } from 'ahooks';

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
        const { list: allRelTestDetailList } = await getTestEntitiesByRelationWithOrder(
          TestRelationType.PlanRelDetail,
          {
            from: Test.createWithoutData(testPlanId),
          },
          {
            // FIXME: 性能优化
            workspaceKey,
            // 查全部
            queryParams: {
              limit: 99999,
              offset: 0,
            },
            include: [],
            select: ['objectId'],
          },
        );
        return allRelTestDetailList?.map(detail => get(detail, 'objectId')) ?? [];
      } else if (type === 'Execution') {
        // 测试执行的用例范围
        const { list: allRelTestRunList } = await getTestEntitiesByRelationWithOrder(
          TestRelationType.ExecutionRelRun,
          {
            from: Test.createWithoutData(testExecutionId),
          },
          {
            // FIXME: 性能优化
            workspaceKey,
            // 查全部
            queryParams: {
              limit: 99999,
              offset: 0,
            },
            include: ['runReferenceDetail'],
            select: ['objectId', 'runReferenceDetail'],
          },
        );

        return allRelTestRunList?.map(run => get(run, 'runReferenceDetail.objectId')) ?? [];
      }
    },
    {
      ready: Boolean(workspaceKey && (testPlanId ?? testExecutionId)),
      refreshDeps: [workspaceKey, testPlanId, testExecutionId, type],
    },
  );
};
