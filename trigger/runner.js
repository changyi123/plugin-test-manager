const axios = require('axios');
const path = require('path');
const fs = require('fs');

const fileName = './validate.js';
const sessionToken = 'r:1b1f2ffcf92ae9d1fe7df759536d33f7';
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
    })
    .then(res => {
      console.info(new Date().toUTCString(), res.data);
    });
});
