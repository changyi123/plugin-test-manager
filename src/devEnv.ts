export const getDevConfig = () => {
  try {
    if (process.env.NODE_ENV === 'production' || process.env.PROXIMA_DEV_MODE === 'embed')
      return {};
    const DEV_STORAGE_KEY = 'test_manager_dev';
    return JSON.parse(localStorage.getItem(DEV_STORAGE_KEY)) ?? {};
  } catch (err) {
    return {};
  }
};

export const getParseReqHeader = () => {
  if (process.env.NODE_ENV === 'production') return {};
  return {
    'X-Proxima-API-Token': 'a:d36e77a9a6f5cb1b9d37c6cc',
    'X-Proxima-Actor': getDevConfig().actor || 'osc-admin',
  };
};

export default getDevConfig;
