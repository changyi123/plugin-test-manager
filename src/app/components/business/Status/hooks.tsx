import { keyBy } from 'lodash';
import React from 'react';

import { useBaseAction } from '@/lib/hooks/useContext';

export const useStatusConfig = () => {
  const { getGlobalConfig } = useBaseAction();
  const [statusConfig, setStatusConfig] = React.useState({});

  React.useEffect(() => {
    const runner = async () => {
      const globalConfig = await getGlobalConfig();
      const statusConfig = keyBy(globalConfig?.statuses ?? [], 'key');
      setStatusConfig(statusConfig);
    };
    runner();
  }, [getGlobalConfig]);

  return statusConfig;
};
