import React from 'react';
import { ETestType } from '@/lib/types/Test';

export type ConfigContextType = {
  config: {
    // 测试类型 和 itemType 类型关联
    itemTypeMap: Record<ETestType, 'string'>;
  };
  workspaceId: string;
  setWorkspaceId: (workspaceId: string) => void;
};

export const ConfigContext = React.createContext<ConfigContextType>({} as ConfigContextType);
