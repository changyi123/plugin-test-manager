process.on('unhandledRejection', err => {
  throw err;
});

const Webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const webpackConfig = require('./config/webpack.config')(process.env.NODE_ENV);

const compiler = Webpack(webpackConfig);

const devServerOptions = Object.assign({}, webpackConfig.devServer, {
  open: false,
});

const devServer = new WebpackDevServer(devServerOptions, compiler);

devServer.startCallback(() => {
  console.info(
    `Successfully started server on http://localhost:${webpackConfig.devServer.port || 8080}`,
  );
});
