import React from 'react';

type ProviderContextType = {
  selectedKeys: string[];
  customFields: any[];
};

const ProviderContext = React.createContext({
  selectedKeys: [],
  customFields: [],
} as ProviderContextType);

const Provider: React.FC<ProviderContextType> = ({ customFields, selectedKeys, children }) => {
  const value = React.useMemo(() => {
    return { selectedKeys, customFields };
  }, [customFields, selectedKeys]);
  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
};

export const useProviderContext = () => React.useContext(ProviderContext);
export default Provider;
