import React from 'react';

import { useBaseAction } from '@/lib/hooks/useContext';

export const useItemLinkTypeConfig = (): { TestToDefect?: '' } => {
  const { getGlobalConfig } = useBaseAction();
  const [itemLinkTypeConfig, setItemLinkTypeConfig] = React.useState({});

  React.useEffect(() => {
    const runner = async () => {
      const globalConfig = await getGlobalConfig();
      const itemLinkTypeMapping = globalConfig?.itemLinkTypeMapping ?? {};
      setItemLinkTypeConfig(itemLinkTypeMapping);
    };
    runner();
  }, [getGlobalConfig]);

  return itemLinkTypeConfig;
};
