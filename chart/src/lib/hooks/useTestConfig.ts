import { useCallback, useEffect, useState } from 'react';

import fetch from '../fetch';
import { getPluginWebTriggerBaseUrl } from '../util';

const pluginWebTriggerBaseUrl = getPluginWebTriggerBaseUrl();

export default function useTestConfig(workspaceKey) {
  const [testConfig, setTestConfig] = useState();
  const searchBasicData = useCallback(async workspaceKey => {
    const data = await fetch.$post(`${pluginWebTriggerBaseUrl}/api-query-basic-data`, {
      workspaceKey,
    });
    setTestConfig(data);
  }, []);

  useEffect(() => {
    if (workspaceKey) {
      searchBasicData(workspaceKey);
    }
  }, [searchBasicData, workspaceKey]);

  return testConfig;
}
