export const getDevConfig = () => {
  const DEV_STORAGE_KEY = 'test_manager_dev';
  return JSON.parse(localStorage.getItem(DEV_STORAGE_KEY));
};

export const getParseReqHeader = () => {
  return {
    'X-Proxima-API-Token': 'a:d36e77a9a6f5cb1b9d37c6cc',
    'X-Proxima-Actor': getDevConfig().actor || 'osc-admin',
  };
};

export default getDevConfig;
