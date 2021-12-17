import React from 'react';
import { Button } from '@osui/ui';
import { useTestConfig } from '@/lib/hooks/useContext';

const Execution = () => {
  const { testEntity } = useTestConfig();

  const addTestExecution = React.useCallback(() => {
    console.info(testEntity?.toJSON());
  }, [testEntity]);

  return (
    <div>
      <Button type="primary" onClick={addTestExecution}>
        添加测试执行
      </Button>
    </div>
  );
};

export default React.memo(Execution);
