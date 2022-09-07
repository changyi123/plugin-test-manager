import React from 'react';
import { Workspace } from '@/lib/types/App';

export const DataContext = React.createContext(
  {} as {
    globalConfig: any;
    refreshGlobalConfig: () => Promise<any>;
    workspace: Workspace;
    toggleWorkspace: () => Promise<void>;
  },
);
