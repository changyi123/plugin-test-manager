import React from 'react';
// import { EventEmitter } from 'ahooks/es/useEventEmitter';

type RepositoryDataContextType = {
  workspaceId: string;
};

const RepositoryDataContext = React.createContext<RepositoryDataContextType>({ workspaceId: '' });
export const useRepositoryContext = () => React.useContext(RepositoryDataContext);

type RepositoryDataProviderProps = RepositoryDataContextType & {
  children: React.ReactNode;
};

const RepositoryDataProvider: React.FC<RepositoryDataProviderProps> = ({
  children,
  ...contextValues
}) => {
  return (
    <RepositoryDataContext.Provider value={contextValues}>
      {children}
    </RepositoryDataContext.Provider>
  );
};

export default React.memo(RepositoryDataProvider);
