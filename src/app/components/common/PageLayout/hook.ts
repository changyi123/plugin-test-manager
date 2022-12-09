import React from 'react';
import { useLocation } from 'react-router-dom';
import { useLocalStorageState, useSize } from 'ahooks';
import { generateStorageKey, isInOne } from '@/lib/utils/helper';

/**
 * 判断当前页面是否有 one header
 */
const hasOneHeader = () => {
  return isInOne() && window?.location?.pathname?.includes('/plugin');
};

export const useLayoutHeight = () => {
  const offsetY = 63;

  const size = useSize(document.querySelector('[data-element-id="workspace.layout.content"]'));
  const pageHeader = useSize(
    document.querySelector('[data-element-id="test-manager-page-layout-header"]'),
  );

  React.useEffect(() => {
    const layoutElement = document.querySelector('[data-element-id="workspace.layout.content"]');
    if (layoutElement) {
      //  FIXME: 临时方案：如果有 one 顶部导航需要减去该导航的高度
      if (hasOneHeader()) {
        (layoutElement as any).style.height = 'calc(100vh - 56px)';
      }

      // 删除 child 节点的 padding
      const workspacePluginContainerDOM = layoutElement.children?.[0] ?? ({} as any);
      workspacePluginContainerDOM.style = 'padding: 0';
    }
  }, []);
  return (size?.height ?? 700) - (pageHeader?.height ?? offsetY);
};

export const useResizableWidth = () => {
  const DEFAULT_WIDTH = 300;
  const location = useLocation();
  const LOCAL_STORAGE_KEY = generateStorageKey('resizable-width', location.pathname);
  return useLocalStorageState(LOCAL_STORAGE_KEY, {
    defaultValue: DEFAULT_WIDTH,
    serializer(value) {
      return String(value) ?? '300';
    },
    deserializer(value) {
      return Number(value) ? Number(value) : DEFAULT_WIDTH;
    },
  });
};
