const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const browser = env.browser || 'chrome'; // 默认构建 Chrome

  return {
    entry: {
        background: './src/background/background.js',
        popup: './src/popup/popup.js',
        content: './src/content/content.js'
    },
    output: {
      path: path.resolve(__dirname, `dist/${browser}`),
      filename: '[name].js',
      clean: false // 不自动清理，因为我们要同时构建多个浏览器
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              envName: isProduction ? 'production' : 'development'
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/icons/[name][ext]'
          }
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: `manifests/${browser}.json`, to: 'manifest.json' },
          { from: 'assets/icons', to: 'assets/icons' },
          { from: 'src/_locales', to: '_locales' }
        ]
      }),
      new HtmlWebpackPlugin({
        template: './src/popup/popup.html',
        filename: 'popup.html',
        chunks: ['popup']
      }),
      ...(isProduction ? [new MiniCssExtractPlugin()] : [])
    ],
    resolve: {
      extensions: ['.js', '.css'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@models': path.resolve(__dirname, 'src/models')
      }
    },
    devtool: isProduction ? false : 'cheap-module-source-map',
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    }
  };
};