import React from 'react';

export type ConfigContextType = {
  // TODO:
  config: unknown;
  workspaceId: string;
  setWorkspaceId: (workspaceId: string) => void;
};

export const ConfigContext = React.createContext<ConfigContextType>({} as ConfigContextType);
