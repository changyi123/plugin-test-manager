import React from 'react';
import { useRequest, useSize } from 'ahooks';
import { getlinkedTestEntityByQuery } from '@/lib/api/item';
import { TestLinkType, TestType } from '@/lib/constants';

export const useSetTableHeight = () => {
  const headerSize = useSize(
    document.querySelector('[data-element-id="test-manager-execution-table-header"]'),
  );

  React.useEffect(() => {
    const layoutElement = document.querySelector(
      '[data-element-id="test-manager-execution-table-body"]',
    );
    if (layoutElement) {
      // 删除 child 节点的 padding
      (layoutElement as any).style = `height: calc(100% - ${headerSize?.height || 94}px)`;
    }
  }, [headerSize]);
};

export const useGetTestIdByPlan = ({ workspaceKey, planId }) => {
  const data = useRequest(
    async () => {
      if (!planId) return [];
      const { list: ids } = await getlinkedTestEntityByQuery({
        query: {
          workspaceKey: workspaceKey,
        },
        limit: 9999,
        linkType: TestLinkType.CaseLinkPlan,
        sourceIds: [planId],
        destinationType: TestType.Case,
        descending: [],
        onlySelectId: true,
      });

      return ids as string[];
    },
    {
      refreshDeps: [planId, workspaceKey],
      cacheTime: 99999999999,
      staleTime: 99999999999,
    },
  );

  return data;
};
