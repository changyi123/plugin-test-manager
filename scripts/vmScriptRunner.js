/**
 * vm 本地脚本调试
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

const fileName = '../trigger/web/script/create-chart-groups.ts';
const sessionToken = 'r:59e7d42c8fa4dcc850439d5182d04d2e';
const params = {
  appKey: 'test_manager',
};

const fullPath = path.join(__dirname, fileName);

fs.watchFile(fullPath, () => {
  const script = fs.readFileSync(fullPath, {
    encoding: 'utf8',
  });

  axios
    .post('http://localhost:4000/app-function', {
      script,
      params,
      sessionToken,
      applicationId: 'osc',
    })
    .then(res => {
      console.info(new Date().toUTCString(), res.data);
    });
});
