/**
 * vm 本地脚本调试
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

const fileName = '../trigger/appTrigger/sqlRunner.js';
const sessionToken = 'r:31305af20e6efcd6af1021992ec68afe';
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
      // applicationId: 'zhengzhou',
    })
    .then(res => {
      console.info(new Date().toUTCString(), res.data);
    });
});
