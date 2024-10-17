process.on('unhandledRejection', err => {
  console.error(err);
});

const Webpack = require('webpack');
const webpackConfig = require('./config/webpack.config')(process.env.NODE_ENV);

const compiler = Webpack(webpackConfig);

compiler.run((err, stats) => {
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error('error: ', err.details);
    }
    return;
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    console.error('error: ', info.errors);
  }

  // if (stats.hasWarnings()) {
  //   console.warn('warn: ', info.warnings);
  // }
});
