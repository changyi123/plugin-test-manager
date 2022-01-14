const axios = require('axios');
const path = require('path');
const fs = require('fs');

const fileName = './initialScript.js';
const sessionToken = 'r:9d2ed95f4825ddbbfd030ed6f2058350';
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
