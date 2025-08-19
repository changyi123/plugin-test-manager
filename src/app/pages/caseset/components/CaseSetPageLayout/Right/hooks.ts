import { useSize } from 'ahooks';
import React from 'react';

export const useSetTableHeight = () => {
  const headerSize = useSize(
    document.querySelector('[data-element-id="test-manager-caseset-table-header"]'),
  );

  React.useEffect(() => {
    const layoutElement = document.querySelector(
      '[data-element-id="test-manager-caseset-table-body"]',
    );
    if (layoutElement) {
      // 删除 child 节点的 padding
      (layoutElement as any).style = `height: calc(100% - ${headerSize?.height || 94}px)`;
    }
  }, [headerSize]);
};
