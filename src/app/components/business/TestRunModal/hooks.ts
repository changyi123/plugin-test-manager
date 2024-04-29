import React from 'react';

import { useBaseAction } from '@/lib/hooks/useContext';

export const useItemLinkTypeConfig = (): { TestToDefect?: '' } => {
  const { globalTestConfig } = useBaseAction();
  const [itemLinkTypeConfig, setItemLinkTypeConfig] = React.useState({});

  React.useEffect(() => {
    const runner = async () => {
      const itemLinkTypeMapping = globalTestConfig?.itemLinkTypeMapping ?? {};
      setItemLinkTypeConfig(itemLinkTypeMapping);
    };
    runner();
  }, [globalTestConfig]);

  return itemLinkTypeConfig;
};
