import { keyBy } from 'lodash';
import React from 'react';

import { useBaseAction } from '@/lib/hooks/useContext';

export const useStatusConfig = () => {
  const { globalTestConfig } = useBaseAction();
  const [statusConfig, setStatusConfig] = React.useState({});

  React.useEffect(() => {
    const runner = async () => {
      const statusConfig = keyBy(globalTestConfig?.statuses ?? [], 'key');
      setStatusConfig(statusConfig);
    };
    runner();
  }, [globalTestConfig]);

  return statusConfig;
};
