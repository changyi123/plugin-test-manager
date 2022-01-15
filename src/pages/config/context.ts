import React from 'react';
import { Workspace } from '@/lib/types/App';

export const DataContext = React.createContext(
  {} as {
    workspace: Workspace;
    toggleWorkspace: () => Promise<void>;
  },
);
