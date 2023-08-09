const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
const hasha = require('hasha');
const autoprefixer = require('autoprefixer');
const namespacePrefix = require('postcss-selector-namespace');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackBar = require('webpackbar');
const webpack = require('webpack');
require('dotenv').config();

const BundleAnalyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
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

const getExternalDependencies = isProd => {
  const productionExternalDependencies = [isProd && 'parse'].filter(Boolean);
  // docx template 构建排除此依赖
  const DocxTemplateDependencyKeys = ['vm', 'stream'];
  // 暂时先加 proxima-key 测试，后续增加更多的模块
  const UseExternalDependencyKeys = ['react', 'react-dom', 'proxima-sdk'].concat(
    DocxTemplateDependencyKeys,
    productionExternalDependencies,
  );
  const SharedComponentKey = 'proxima_shared_components';

  const getExternal = name => {
    return ['window modules', name];
  };

  return [
    'qiankun',
    {
      antd: getExternal('antd'),
      react: getExternal('react'),
      'react-dom': getExternal('reactDOM'),
      axios: getExternal('axios'),
      ...UseExternalDependencyKeys.reduce(
        (deps, key) => ({
          ...deps,
          [key]: {
            commonjs2: key,
            commonjs: key,
            amd: key,
            root: [SharedComponentKey, key],
          },
        }),
        {},
      ),
    },
  ];
};

// output配置
const outputConfig = isProd =>
  isProd
    ? {
        filename: 'js/[name].[chunkhash:6].min.js',
        path: path.resolve(__dirname, distOutputPath),
        publicPath: './',
        library: appPrefix,
        libraryTarget: 'umd',
      }
    : {
        filename: 'main/[name].[id:4].js',
        path: path.resolve(__dirname, distOutputPath),
        publicPath: '/',
        library: appPrefix,
        libraryTarget: 'umd',
        chunkFilename: '[name].chunk.js',
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
  const { PROXIMA_USE_EXTERNAL_DEPENDENCIES } = process.env;
  const { ANALYZER_PACKAGE } = cliEnv;

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

  const lessLoaderConfig = {
    loader: 'less-loader',
  };

  const cssLoaderConfig = {
    loader: 'css-loader',
    options: {
      modules: {
        getLocalIdent,
      },
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
    entry: './app/index.tsx',
    mode: isProd ? 'production' : 'development',
    output: outputConfig(isProd),
    ...(isDev && {
      devtool: 'source-map',
    }),
    // 生产环境使用 proxima-app 传入的
    externals:
      isProd || PROXIMA_USE_EXTERNAL_DEPENDENCIES ? getExternalDependencies(isProd) : undefined,
    resolve: {
      extensions: ['.js', '.css', '.jsx', '.tsx', '.ts'],
      alias: {
        '@': path.resolve(__dirname, 'app/'),
        common: path.resolve(__dirname, 'common/'),
        parse: path.resolve(__dirname, '../node_modules/parse'),
        react: path.resolve(__dirname, '../node_modules/react'),
        'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
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
      ANALYZER_PACKAGE && new BundleAnalyzer(),
      new webpack.DefinePlugin({
        ...resolveClientEnv(false, cliEnv),
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'app/public/index.html'),
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
            },
          },
        },
        {
          test: /\.css/,
          include: [
            // path.resolve(__dirname, '../../proxima-share-components/dist'),
            path.resolve(__dirname, '../node_modules/@giteeteam/apps-team-components/dist'),
          ],
          use: [
            classNamesConfig,
            extractOrStyleLoaderConfig,
            'css-loader',
            getPostcssLoaderConfig(false),
          ],
        },
        {
          test: /\.css/,
          include: [path.resolve(__dirname, 'src')],
          use: [
            classNamesConfig,
            extractOrStyleLoaderConfig,
            'css-loader',
            getPostcssLoaderConfig(true),
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
        {
          test: /locales/,
          use: ['@alienfast/i18next-loader'],
          // include: [path.resolve(__dirname, '../locales/**/index.json')],
        },
      ],
    },
    optimization: {
      runtimeChunk: 'single',
      minimize: true,
      usedExports: true,
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',

      splitChunks: {
        chunks: 'all',
        minSize: 100000,
        minChunks: 2,
        maxAsyncRequests: 20,
        maxInitialRequests: 6,
      },
    },
  };

  return isProd ? webpackConfig : smp.wrap(webpackConfig);
};
