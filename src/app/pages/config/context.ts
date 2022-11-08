import React from 'react';
import { Workspace } from '@/lib/types/App';

export const DataContext = React.createContext(
  {} as {
    checkAllWorkspace?: boolean;
    setCheckAllWorkspace?: (val) => void;
    globalConfig: any;
    refreshGlobalConfig: () => Promise<any>;
    workspace: Workspace;
    toggleWorkspace: () => Promise<void>;
    showAllWorkspaceCheck?: boolean;
    setShowAllWorkspaceCheck?: (val) => void;
  },
);
