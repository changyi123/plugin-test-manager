/**
 * vm 本地脚本调试
 */
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const { promisify } = require('util');
const colors = require('ansi-colors');
const debounce = require('lodash/debounce');
const cliProgress = require('cli-progress');

/** webTrigger 监听目录 */
const TriggerSourceDirectory = path.resolve(__dirname, '../src');
/** vm 执行目录 */
const DestDirectory = path.resolve(
  __dirname,
  '../../../minio/test_manager/production/0.0.1/server-side',
);
/** webTrigger 构建输出目录 */
const SrcDirectory = path.resolve(__dirname, '../dist');

const execCommand = async cmd =>
  promisify(require('child_process').exec)(cmd, {
    cwd: path.resolve(__dirname, '../'),
  });

const watcher = chokidar.watch(TriggerSourceDirectory);
const progress = {
  percent: 0,
  _total: 100,
  _space: 20,
  _interval: 100,
  _timer: null,
  bar: new cliProgress.SingleBar(
    {
      format: 'build... |' + colors.greenBright('{bar}') + '| {percentage}%',
      clearOnComplete: true,
    },
    cliProgress.Presets.shades_classic,
  ),
  start: () => {
    progress.percent = 0;
    progress.bar.start(progress._total, 0);
    progress._timer = setInterval(() => {
      const step = progress._total / progress._space;
      if (progress._total - progress.percent > step) {
        progress.percent += step;
        progress.bar.update(progress.percent);
      }
    }, progress._interval);
  },
  end: () => {
    progress.bar.update(progress._total);
  },
  stop: () => {
    clearInterval(progress._timer);
    progress.bar.update(progress._total);
    progress.bar.stop();
  },
};

let lock = false;

const directoryWatcher = async (event, path) => {
  if (lock) return;
  lock = true;
  let error = null;
  try {
    progress.start();
    await execCommand('npx giteeteam-apps-cli build --no-zip --prod -c version.yml');
    await fs.copy(SrcDirectory, DestDirectory, { overwrite: true });
    progress.end();
  } catch (err) {
    error = err;
  } finally {
    lock = false;
    progress.stop();
    console.info(`${path} changed;`);
    if (error) {
      console.info(`${colors.redBright(error.message)}`);
    } else {
      console.info(`${colors.yellowBright('app build success')}`);
    }
  }
};

watcher.on('all', debounce(directoryWatcher, 500));
