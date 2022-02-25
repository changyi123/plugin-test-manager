import React from 'react';
import { getDevConfig } from '@/devEnv';
import { useSDK } from '@projectproxima/plugin-sdk';
import TestManagerProvider from '@/components/common/TestManagerProvider';

type PageContextType = { workspaceKey: string };

export const PageContext = React.createContext<PageContextType>({ workspaceKey: '' });

const PageProvider: React.FC = ({ children }) => {
  const { context } = useSDK();
  const workspaceKey = context?.env?.WORKSPACE_KEY ?? getDevConfig().workspaceKey;

  return (
    <TestManagerProvider workspaceKey={workspaceKey}>
      <PageContext.Provider value={{ workspaceKey }}>{children}</PageContext.Provider>
    </TestManagerProvider>
  );
};

export default PageProvider;
