const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const LessPluginFunctions = require('less-plugin-functions');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const hasha = require('hasha');
const autoprefixer = require('autoprefixer');
const namespacePrefix = require('postcss-selector-namespace');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackBar = require('webpackbar');
const webpack = require('webpack');
require('dotenv').config();

const smp = new SpeedMeasurePlugin();

const distOutputPath = 'dist';
const appPrefix = 'test-manager';

// 环境变量
function resolveClientEnv(raw, cliEnv) {
  const prefixRE = /^PROXIMA_/;
  const assignedEnv = Object.assign({}, cliEnv, process.env);
  const env = {};
  Object.keys(assignedEnv).forEach(key => {
    if (prefixRE.test(key) || key === 'NODE_ENV') {
      env[key] = assignedEnv[key];
    }
  });

  if (raw) {
    return env;
  }

  for (const key in env) {
    env[key] = JSON.stringify(env[key]);
  }
  return {
    'process.env': env,
  };
}

// output配置
const outputConfig = isProd =>
  isProd
    ? {
        filename: 'js/[name].[chunkhash].min.js',
        path: path.resolve(__dirname, distOutputPath),
        publicPath: './',
        library: appPrefix,
        libraryTarget: 'umd',
      }
    : {
        filename: 'main.js',
        path: path.resolve(__dirname, distOutputPath),
        publicPath: '/',
        library: appPrefix,
        libraryTarget: 'umd',
      };

const getLocalIdent = ({ resourcePath }, localIdentName, localName) => {
  if (localName === appPrefix) {
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
  const { PROXIMA_DEV_MODE, PROXIMA_USE_EXTERNALS } = process.env;

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

  const getPostcssLoaderConfig = useNamespace => {
    let plugins = [autoprefixer];
    if (useNamespace) {
      plugins = plugins.concat(
        namespacePrefix({
          namespace: `#${appPrefix}`,
        }),
      );
    }
    return {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins,
        },
      },
    };
  };

  const webpackConfig = {
    entry: './src/index.tsx',
    mode: isProd ? 'production' : 'development',
    output: outputConfig(isProd),
    devtool: (() => {
      if (isDev) {
        return 'source-map';
      }
      return false;
    })(),
    // 生产环境使用 proxima-app 传入的
    externals:
      PROXIMA_USE_EXTERNALS && (isProd || PROXIMA_DEV_MODE === 'embed')
        ? {
            react: {
              amd: 'react',
              commonjs: 'react',
              commonjs2: 'react',
              root: '_PROXIMA_React',
            },
            'react-dom': {
              amd: 'react-dom',
              commonjs: 'react-dom',
              commonjs2: 'react-dom',
              root: '_PROXIMA_ReactDOM',
            },
          }
        : undefined,
    resolve: {
      extensions: ['.js', '.css', '.jsx', '.tsx', '.ts'],
      alias: {
        '@': path.resolve(__dirname, 'src/'),
        parse: path.resolve(__dirname, './node_modules/parse'),
        react: path.resolve(__dirname, './node_modules/react'),
        'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      },
      fallback: {
        fs: false,
        tls: false,
        net: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        child_process: false,
        crypto: false,
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
      new webpack.DefinePlugin({ ...resolveClientEnv(false, cliEnv) }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        filename: 'index.html',
        inject: true,
        templateParameters: () => resolveClientEnv(true, cliEnv),
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
          use: [
            classNamesConfig,
            extractOrStyleLoaderConfig,
            'css-loader',
            getPostcssLoaderConfig(true),
          ],
        },
        {
          test: /\.css/,
          include: [path.resolve(__dirname, 'node_modules/@projectproxima/components/dist')],
          use: [
            classNamesConfig,
            extractOrStyleLoaderConfig,
            'css-loader',
            getPostcssLoaderConfig(false),
          ],
        },
        {
          test: /\.less$/,
          use: [
            classNamesConfig,
            extractOrStyleLoaderConfig,
            cssLoaderConfig,
            getPostcssLoaderConfig(true),
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
