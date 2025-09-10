const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const LessPluginFunctions = require('less-plugin-functions');
const AntdDayjsWebpackPlugin = require('antd-dayjs-webpack-plugin');
const Webpack = require('webpack');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const hasha = require('hasha');
const autoprefixer = require('autoprefixer');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const WebpackBar = require('webpackbar');

const distOutputPath = 'dist';

const getLocalIdent = ({ resourcePath }, localIdentName, localName) => {
  if (/\.global\.(css|less)$/.test(resourcePath) || /node_modules/.test(resourcePath)) {
    // 不做cssModule 处理的
    return localName;
  }
  return `${localName}__${hasha(resourcePath + localName, { algorithm: 'md5' }).slice(0, 8)}`;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports = (cliEnv = {}, argv) => {
  const mode = argv.mode;

  const tag = argv.env?.PROXIMA_VERSION_TAG;

  if (!['production', 'development'].includes(mode)) {
    throw new Error('The mode is required for NODE_ENV, BABEL_ENV but was not specified.');
  }

  const isProd = mode === 'production';

  const classNamesConfig = {
    loader: '@ecomfe/class-names-loader',
    options: {
      classNamesModule: require.resolve('classnames'),
    },
  };

  const getStyleLoader = () => ({
    loader: 'style-loader',
    options: {
      attributes: { id: 'test-manager-webpack-style' }, // 便于识别
      injectType: 'singletonStyleTag',
      insert: '#webpack-style-holder',
    },
  });

  const cssLoaderConfig = {
    loader: 'css-loader',
    options: {
      modules: { getLocalIdent },
      importLoaders: 1,
    },
  };

  const postcssLoaderConfig = {
    loader: 'postcss-loader',
    options: {
      postcssOptions: {
        plugins: [autoprefixer],
      },
    },
  };

  const webpackConfig = {
    entry: {
      'combined-components': './src',
    },
    mode: isProd ? 'production' : 'development',
    output: {
      filename: '[name]/index.js',
      path: path.resolve(__dirname, distOutputPath),
      publicPath: isProd ? './' : '/',
      libraryTarget: 'commonjs2',
    },
    resolve: {
      extensions: ['.js', '.css', '.jsx', '.tsx', '.ts'],
      alias: {
        '@': path.resolve(__dirname, 'src/'),
      },
    },
    devServer: {
      port: 8000,
      hot: true, // 由于微前端热重载不支持局部更新，开启本项可使用全量刷新
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      },
    },
    plugins: [
      // new BundleAnalyzerPlugin(),
      isProd &&
        new Webpack.BannerPlugin({
          banner: `(() => {let webpackStyleLink = document.createElement("link");webpackStyleLink.rel="stylesheet";let href = document.querySelector('#webpack-style-holder').getAttribute('data-diy-plugin-env') || '';href += 'test_manager/production/${tag}/client-side/combined-components/combined-components.css?t=${new Date().getTime()}';webpackStyleLink.href=href;const root = document.querySelector("#webpack-style-holder");root.appendChild(webpackStyleLink);href = '';webpackStyleLink = null;})();`,
          raw: true,
          entryOnly: true,
          test: /\.js/,
        }),
      isProd &&
        new MiniCssExtractPlugin({
          filename: '[name].css',
          chunkFilename: '[name].chunk.css',
        }),
      new AntdDayjsWebpackPlugin(),
      new WebpackBar(),
      new CleanWebpackPlugin(),
    ].filter(Boolean),
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css/,
          use: [
            classNamesConfig,
            isProd ? MiniCssExtractPlugin.loader : getStyleLoader(),
            'css-loader',
            postcssLoaderConfig,
          ],
        },
        {
          test: /\.less$/,
          use: [
            classNamesConfig,
            isProd ? MiniCssExtractPlugin.loader : getStyleLoader(),
            cssLoaderConfig,
            postcssLoaderConfig,
            {
              loader: 'less-loader',
              options: {
                lessOptions: {
                  javascriptEnabled: true,
                  modifyVars: {
                    '@ant-prefix': 'test-manager',
                  },
                  plugins: [new LessPluginFunctions({ alwaysOverride: true })],
                },
              },
            },
          ],
        },
        // 静态资源
        {
          test: /\.(png|jpg|gif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'resource/[hash][ext][query]',
          },
        },
        {
          test: /\.svg$/,
          use: ['@svgr/webpack'],
        },
      ],
    },
  };

  webpackConfig.externals = [
    {
      react: 'react',
      'react-dom': 'react-dom',
      antd: 'antd',
      classnames: 'classnames',
      lodash: 'lodash',
      'proxima-event': 'proxima-event',
      insight: 'insight',
      formik: 'formik',
    },
    function ({ _context, request }, callback) {
      if (request.startsWith('proxima-sdk')) {
        return callback(null, 'commonjs2 ' + request);
      }
      // 继续下一步且不外部化引用
      callback();
    },
  ];

  return webpackConfig;
};
