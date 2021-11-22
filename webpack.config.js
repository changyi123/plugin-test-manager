const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const LessPluginFunctions = require('less-plugin-functions');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const hasha = require('hasha');
const autoprefixer = require('autoprefixer');
const namespacePefixer = require('postcss-selector-namespace');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackBar = require('webpackbar');

const smp = new SpeedMeasurePlugin();

const distOutputPath = 'dist';
const appPerfix = 'test-manager';

// output配置
const outputConfig = isProd =>
  isProd
    ? {
        filename: 'js/[name].[chunkhash].min.js',
        path: path.resolve(__dirname, distOutputPath),
        publicPath: './',
        library: appPerfix,
        libraryTarget: 'umd',
      }
    : {
        filename: 'main.js',
        path: path.resolve(__dirname, distOutputPath),
        publicPath: '/',
        library: appPerfix,
        libraryTarget: 'umd',
      };

const getLocalIdent = ({ resourcePath }, localIdentName, localName) => {
  if (localName === appPerfix) {
    return localName;
  }
  if (/\.global\.(css|less)$/.test(resourcePath) || /node_modules/.test(resourcePath)) {
    // 不做cssModule 处理的
    return localName;
  }
  return `${localName}__${hasha(resourcePath + localName, { algorithm: 'md5' }).slice(0, 8)}`;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
module.exports = (cliEnv = {}, argv) => {
  const mode = argv.mode;

  if (!['production', 'development'].includes(mode)) {
    throw new Error('The mode is required for NODE_ENV, BABEL_ENV but was not specified.');
  }

  const isProd = mode === 'production';
  const isDev = mode === 'development';

  const classNamesConfig = {
    loader: '@ecomfe/class-names-loader',
    options: {
      classNamesModule: require.resolve('classnames'),
    },
  };
  // 生产环境使用 MiniCssExtractPlugin
  const extractOrStyleLoaderConfig = isProd ? MiniCssExtractPlugin.loader : 'style-loader';

  // 根据 patterns 使用 style-resources-loader
  const makeStyleResourcesLoader = patterns => ({
    loader: 'style-resources-loader',
    options: {
      patterns,
      injector: 'append',
    },
  });

  const lessLoaderConfig = {
    loader: 'less-loader',
    options: {
      lessOptions: {
        javascriptEnabled: true,
        modifyVars: {
          'ant-prefix': 'ant',
        },
        plugins: [new LessPluginFunctions({ alwaysOverride: true })],
      },
    },
  };

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
        plugins: [
          namespacePefixer({
            namespace: `#${appPerfix}`,
          }),
          autoprefixer,
        ],
      },
    },
  };
  const webpackConfig = {
    entry: './src/index.tsx',
    mode: isProd ? 'production' : 'development',
    output: outputConfig(isProd),
    devtool: (() => {
      if (isProd) {
        return 'source-map';
      }
      if (isDev) {
        return 'inline-cheap-module-source-map';
      }
      return false;
    })(),
    resolve: {
      extensions: ['.js', '.css', '.jsx', '.tsx', '.ts'],
      alias: {
        '@': path.resolve(__dirname, 'src/'),
        react: path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      },
    },
    devServer: {
      // hot: 'only',
      // hot: true, // 由于微前端热重载不支持局部更新，开启本项可使用全量刷新
      static: {
        directory: path.resolve(__dirname, '../dist'),
        serveIndex: true,
        watch: true,
      },
      webSocketServer: 'ws',
      historyApiFallback: {
        disableDotRule: true,
        index: '/',
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
      },
    },
    plugins: [
      new WebpackBar(),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        filename: 'index.html',
        inject: true,
      }),
      isProd &&
        new MiniCssExtractPlugin({
          filename: '[name].[contenthash].css',
          chunkFilename: '[name].[contenthash].chunk.css',
        }),
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
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
              plugins: [['import', { libraryName: 'antd', libraryDirectory: 'es', style: true }]],
            },
          },
        },
        {
          test: /\.css/,
          include: [
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, 'node_modules/antd/'),
            path.resolve(__dirname, 'node_modules/@osui'),
            path.resolve(__dirname, 'node_modules/github-markdown-css'),
          ],
          use: [classNamesConfig, extractOrStyleLoaderConfig, 'css-loader', postcssLoaderConfig],
        },
        {
          test: /\.less$/,
          use: [
            classNamesConfig,
            extractOrStyleLoaderConfig,
            cssLoaderConfig,
            postcssLoaderConfig,
            lessLoaderConfig,
            makeStyleResourcesLoader([
              path.resolve(__dirname, 'node_modules/@osui/theme/dist/antd-vars-patch.less'),
              path.resolve(
                __dirname,
                'node_modules/@osui/theme/dist/less-functions-overrides.less',
              ),
            ]),
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
  return isProd ? webpackConfig : smp.wrap(webpackConfig);
};
