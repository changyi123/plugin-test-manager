const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');

const manifestPath = path.resolve(__dirname, '../manifest.yml'); // Manifest文件的路径

const getVersion = () => {
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = YAML.parse(manifestContent);
    // 在这里可以使用Manifest中的参数
    return manifest.app.version;
  } catch (err) {
    console.error('读取Manifest文件时出错:', err);
  }
};

exports.getVersion = getVersion;
