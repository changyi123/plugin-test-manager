/**
 * vm 本地脚本调试
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

const fileName = '../trigger/report/stats.js';
const sessionToken = 'r:04b625b85cf368d985751025df820e53';
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
