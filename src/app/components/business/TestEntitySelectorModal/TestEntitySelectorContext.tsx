import React, { createContext, useContext } from 'react';

interface TestEntitySelectorContextType {
  type?: string; // 操作类型，如 'add' 表示新建执行任务，可以做一些区分
}

const TestEntitySelectorContext = createContext<TestEntitySelectorContextType>({});

export const TestEntitySelectorProvider: React.FC<{
  children: React.ReactNode;
  type?: string;
}> = ({ children, type }) => {
  return (
    <TestEntitySelectorContext.Provider value={{ type }}>
      {children}
    </TestEntitySelectorContext.Provider>
  );
};

export const useTestEntitySelectorContext = () => {
  const context = useContext(TestEntitySelectorContext);
  if (context === undefined) {
    throw new Error('useTestEntitySelectorContext must be used within a TestEntitySelectorProvider');
  }
  return context;
};
