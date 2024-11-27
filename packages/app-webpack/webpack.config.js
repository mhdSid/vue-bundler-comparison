const path = require('path')
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js'
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        'vue-vendor': {
          test: /[\\/]node_modules[\\/]vue[\\/]/,
          name: 'vue-vendor',
          chunks: 'all',
          priority: 20
        },
        'table-vendor': {
          test: /[\\/]node_modules[\\/](@tanstack[\\/]vue-table|date-fns)[\\/]/,
          name: 'table-vendor',
          chunks: 'all',
          priority: 10
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 5
        },
        shared: {
          test: /[\\/]packages[\\/]shared[\\/]/,
          name: 'shared',
          chunks: 'all'
        }
      }
    }
  }
}
