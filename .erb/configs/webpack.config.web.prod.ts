import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { merge } from 'webpack-merge';
import baseConfig from './webpack.config.web.base';
import webpackPaths from './webpack.paths';

const configuration: webpack.Configuration = {
  mode: 'production', // 切换到生产模式

  target: 'web',

  entry: [
    path.join(webpackPaths.srcRendererPath, 'index.tsx'), // 入口文件
  ],

  output: {
    path: webpackPaths.distRendererPath, // 输出路径为 dist 文件夹
    publicPath: '/', // 静态资源的公共路径
    filename: '[name].[contenthash].js', // 使用 contenthash 以支持缓存控制
    library: {
      type: 'umd',
    },
    clean: true, // 清理旧的构建文件
  },

  module: {
    rules: [
      {
        test: /\.s?(c|a)ss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: false, // 关闭 Source Map
              importLoaders: 1,
            },
          },
          'sass-loader',
        ],
        include: /\.module\.s?(c|a)ss$/,
      },
      {
        test: /\.s?css$/,
        use: ['style-loader', 'css-loader', 'sass-loader', 'postcss-loader'],
        exclude: /\.module\.s?(c|a)ss$/,
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              prettier: false,
              svgo: true, // 启用 SVGO 优化
              svgoConfig: {
                plugins: [{ removeViewBox: false }],
              },
              titleProp: true,
              ref: true,
            },
          },
        ],
      },
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'), // 定义生产环境变量
    }),
    new HtmlWebpackPlugin({
      filename: path.join('index.html'),
      template: path.join(webpackPaths.srcRendererPath, 'index.ejs'), // 使用相同的模板文件
      minify: {
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true,
      },
      isBrowser: true,
      env: 'production',
      isDevelopment: false,
      nodeModules: webpackPaths.appNodeModulesPath,
    }),
  ],

  optimization: {
    minimize: true, // 启用代码压缩
    splitChunks: {
      chunks: 'all', // 分离代码以优化加载性能
    },
  },
};

export default merge(baseConfig, configuration);
