const path = require('path');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const { LibManifestPlugin } = require('webpack');


// npx webpack build ./eccBlind.js
module.exports = {
    mode: 'development',
    output:{
        filename: 'main.js',
        library: {
            name: 'ecc',
            type: 'var',
            //export: 'default', 指将library ecc中的指定的方法对外暴露
        },
        path: path.resolve(__dirname, '../client'),  //output 目录对应一个绝对路径
    },
    plugins: [new NodePolyfillPlugin()],
}