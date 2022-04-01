const axios = require('axios');
const path = require('path');
const fs = require('fs');

const fileName = './import.js';
const sessionToken = 'r:a52fa1e8b36fccd30286097ae2494cd2';
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
