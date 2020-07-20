const path = require('path'),
  { CleanWebpackPlugin } = require('clean-webpack-plugin'),
  CopyPlugin = require('copy-webpack-plugin'),
  webpack = require('webpack'),
  dirTree = require('directory-tree');

require('dotenv').config();

module.exports = {
  mode: process.env.NODE_ENV,
  entry: parseEntrypoints(path.resolve(__dirname, 'src/js')),
  output: {
    filename: 'js/[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/'
  },
  // devtool: 'source-map',
  watchOptions: {
    poll: true,
    ignored: /node_modules/
  },
  module: {
    rules: [{
      test: /\.(s*)css$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: 'css/[name].css'
          }
        },
        'extract-loader',
        'css-loader?-url',
        'sass-loader'
      ]
    },
    {
      test: /\.(jpg|png|gif)$/,
      loader: 'file-loader'
    }]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new webpack.EnvironmentPlugin({ ...process.env }),
    new webpack.ProvidePlugin({
      _: 'lodash',
      $: 'jquery',
      jQuery: 'jquery',
      'window.$': 'jquery',
      'window.jQuery': 'jquery',
    }),
    new webpack.ContextReplacementPlugin(
      /moment[/\\]locale$/,
      /(en|es)(?!-)/
    ),
    new CopyPlugin({
      patterns: [{
        from: path.resolve(__dirname, 'static'),
        to: ''
      }]
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          name: 'vendors',
          chunks: 'all',
          minChunks: 2
        }
      }
    }
  }
};

function parseEntrypoints(context) {
  const entryMap = {};

  dirTree(
    context,
    {
      exclude: /(utilities|.eslint*)/,
      extensions: /\.js$/,
      normalizePath: true
    },
    (file) => {
      const extension = file.path.indexOf(file.extension),
        name = file.path.substring(context.length + 1, extension)
          .replace('/', '~');

      entryMap[name] = file.path;
    }
  );

  return entryMap;
}
