const { merge } = require('webpack-merge');
const baseConfig = require('./webpack.base.js');

module.exports = merge(baseConfig, {
    watch: true,
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        static: './dist',
    },
});