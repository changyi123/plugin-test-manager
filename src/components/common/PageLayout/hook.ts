import React from 'react';
import { useLocation } from 'react-router-dom';
import { useLocalStorageState, useSize } from 'ahooks';
import { generateStorageKey } from '@/lib/utils/helper';

export const useLayoutHeight = () => {
  const offsetY = 63;

  const size = useSize(document.querySelector('[data-element-id="workspace.layout.content"]'));

  React.useEffect(() => {
    const layoutElement = document.querySelector('[data-element-id="workspace.layout.content"]');
    if (layoutElement) {
      // 删除 child 节点的 padding
      const workspacePluginContainerDOM = layoutElement.children?.[0] ?? ({} as any);
      workspacePluginContainerDOM.style = 'padding: 0';
    }
  }, []);
  return (size?.height ?? 700) - offsetY;
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
