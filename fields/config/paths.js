const path = require('path');

const resolve = filePath => path.resolve(__dirname, '../', filePath);

module.exports = {
  // TODO: 默认配置
  pluginIndexJs: resolve('src/index.js'),
  buildPath: resolve('build'),
  publicUrlOrPath: '/',
  pluginPackagePath: resolve('./src'),
  appPackageJSONPath: resolve('./package.json'),
};
