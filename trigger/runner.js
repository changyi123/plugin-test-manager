const axios = require('axios');
const fs = require('fs');

const fileName = './initialScript.js';
const sessionToken = 'r:13b97ae28bee67165f5c0aa76674c962';
const params = {
  appKey: 'test_manager',
};

fs.watchFile(fileName, () => {
  const script = fs.readFileSync(fileName, {
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
