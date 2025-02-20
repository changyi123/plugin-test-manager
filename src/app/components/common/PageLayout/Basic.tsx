import React from 'react';

import ErrorBoundary from '@/components/common/ErrorBoundary';
import { logPluginVersion } from '@/lib/utils/helper';
import { useResizeContainerDOM } from '@/pages/plan/PlanPageLayout/hooks';

logPluginVersion();

const BasicPageLayout = (props: React.PropsWithChildren<{ id?: string }>) => {
  const { id, children } = props;
  const size = useResizeContainerDOM(id);
  const getValidateRenderElement = children => {
    let node = null as React.ReactNode;
    React.Children.forEach(children, child => {
      if (React.isValidElement(child)) {
        node = child;
      }
    });
    return node;
  };
  return (
    <ErrorBoundary>
      <div style={{ height: size?.height ?? '100%' }}>{getValidateRenderElement(children)}</div>
    </ErrorBoundary>
  );
};

export default BasicPageLayout;
