const paths = require('./paths');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const webpack = require('webpack');

require('dotenv').config();

const entry = require('../config/entry');

const resolve = url => path.join(__dirname, url);

module.exports = function (webpackEnv) {
  const isEnvDevelopment = webpackEnv === 'development';
  const isEnvProduction = webpackEnv === 'production';

  const externals = isEnvProduction
    ? [
        function ({ request }, callback) {
          const dependencies = ['antd', 'formik', 'lodash', 'react'];
          if (request.startsWith('proxima-sdk') || dependencies.includes(request)) {
            return callback(null, 'commonjs2 ' + request);
          }

          // 继续下一步且不外部化引用
          callback();
        },
      ]
    : [
        {
          xmlhttprequest: '{XMLHttpRequest:XMLHttpRequest}',
        },
      ];

  const plugins = [
    // new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.REACT_APP_API_SERVER': JSON.stringify(process.env.REACT_APP_API_SERVER),
      'process.env.APPLICATION_ID': JSON.stringify(process.env.APPLICATION_ID),
      'process.env.SESSION_TOKEN': JSON.stringify(process.env.SESSION_TOKEN),
    }),
  ];

  if (isEnvDevelopment) {
    plugins.push(
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, '../public/index.html'),
        filename: 'index.html',
        inject: true,
      }),
    );
  }

  return {
    mode: webpackEnv,
    bail: isEnvProduction,
    entry: isEnvProduction ? entry : paths.pluginIndexJs,
    output: {
      filename: '[name]/index.js',
      path: paths.buildPath,
      libraryTarget: isEnvProduction ? 'commonjs2' : 'umd',
    },
    externals,
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: ['ts-loader'],
          exclude: /node_modules/,
        },
        {
          test: /\.(js|jsx)$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.less$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                modules: {
                  mode: 'local',
                  localIdentName: '[path][name]__[local]',
                },
                importLoaders: 2,
              },
            },
            'postcss-loader',
            {
              loader: 'less-loader',
              options: {
                lessOptions: {
                  javascriptEnabled: true,
                },
              },
            },
          ],
        },
        {
          test: /\.svg$/,
          use: ['@svgr/webpack'],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.js', '.tsx', '.less'],
      alias: {
        '@': resolve('../src'),
      },
      fallback: { http: require.resolve('stream-http'), https: false, buffer: false },
    },
    stats: 'minimal',
    plugins,
    devServer: {
      static: {
        directory: path.join(__dirname, '../build/test-detail'), //允许配置从跟目录下提供静态文件
        publicPath: `/`,
      },
      port: 8000,
    },
  };
};
