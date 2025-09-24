import { useRequest, useSize, useUpdateEffect } from 'ahooks';
import { TestType } from 'common/constant';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';

import { getCasesByStatus, getTestEntityByQuery } from '@/lib/api/item';
import { TestCaseStatusModel } from '@/lib/constants';
import {
  getTestCaseStatusModelValue,
  handleCustomerSelector,
  SearchSelectors,
} from '@/lib/utils/iql';
import { getRepositoryQuery } from '@/lib/utils/tree';

import { TestPlanEntity } from '../type';

type ScopedTestDetailIdsParams = {
  /** 所属空间 */
  workspaceKey: string;
  /** 所选测试计划 id */
  testApprovalId?: string;
  /** 测试执行 id */
  testExecutionId?: string;
  /** 获取类型 */
  type: 'TestApproval';
  selectors?: SearchSelectors;
  selectedNode?: any;
  approvalLinkCaseIds?: string[];
};

export const useGetApprovalLinkCaseIds = (params: ScopedTestDetailIdsParams) => {
  const { workspaceKey, testApprovalId, type } = params;
  return useRequest(
    async () => {
      if (!workspaceKey || !testApprovalId) return {};
      // 测试全部用例 ID
      const { list, total } = await getTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
          type: TestType.Case,
        },
        selector: `测试评审 = '${testApprovalId}'`,
        notConcatField: true,
      });

      console.log('useGetApprovalLinkCaseIds', list);

      return list.map(item => item.objectId);
    },
    {
      ready: Boolean(workspaceKey && testApprovalId),
      refreshDeps: [testApprovalId, workspaceKey, type],
      cacheTime: 99999,
      staleTime: 99999,
    },
  );
};

export const useGetFilterApprovalLinkCaseIds = props => {
  const { workspaceKey, id, planId, type, selectNode, selectors } = props;
  return useRequest(
    async () => {
      if (!workspaceKey || !id) return [];
      if (type !== 'TestApproval') return [];
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
        limit: 99999,
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

export const useTreeParams = (props: {
  workspaceKey: string;
  selectedTestApproval: TestPlanEntity | null;
}) => {
  const [treeParams, setTreeParams] = useState<any>(null);
  const { workspaceKey, selectedTestApproval } = props;

  useUpdateEffect(() => {
    if (!workspaceKey || !selectedTestApproval?.objectId) return;
    setTreeParams({
      selector: `测试评审 = '${selectedTestApproval?.objectId}' and test_manager_type = '${TestType.Case}'`,
    });
  }, [selectedTestApproval?.objectId, workspaceKey]);

  return treeParams;
};
