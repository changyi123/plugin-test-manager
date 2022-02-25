import React from 'react';
import { useLocalStorageState } from 'ahooks';
import { useLocation } from 'react-router-dom';

export const useLayoutHeight = () => {
  const offsetY = 0; // 63
  const [height, setHeight] = React.useState(700);

  React.useEffect(() => {
    const handleResize = () => {
      const layoutElement = document.querySelector('[data-element-id="workspace.layout.content"]');
      console.info('layoutElement', layoutElement?.clientHeight);
      layoutElement && setHeight(layoutElement.clientHeight - offsetY);
    };

    const layoutElement = document.querySelector('[data-element-id="workspace.layout.content"]');
    if (layoutElement) {
      // 删除 child 节点的 padding
      const workspacePluginContainerDOM = layoutElement.children?.[0] ?? ({} as any);
      workspacePluginContainerDOM.style = 'padding: 0';
      handleResize();
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return height;
};

export const useResizableWidth = () => {
  const location = useLocation();
  const key = location.pathname;
  return useLocalStorageState(`plugin-test-manager-resizable-width-${key}`, {
    serializer(value) {
      return String(value) ?? '300';
    },
    deserializer(value) {
      return Number(value) ? Number(value) : 300;
    },
  });
};
