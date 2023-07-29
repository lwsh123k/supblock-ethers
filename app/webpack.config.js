const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

// npm run build  npx webpack
// npm run dev    npx webpack server
module.exports = {
    mode: 'development',
    entry: {
        myToken: './src/js/myToken.js',
        sig: './src/js/sig.js',
        fairIntegerSep: './src/js/fair-integer-sep.js',
        fairIntegerAuto: './src/js/fair-integer-auto.js',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                // 用来匹配 .css 结尾的文件,css文件需要在js文件中引入
                test: /\.css$/,
                // use 数组里面 Loader 执行顺序是从右到左
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            // 以 public/index.html 为模板创建文件
            // 新的html文件有两个特点：1. 内容和源文件一致 2. 自动引入打包生成的js等资源
            template: path.resolve(__dirname, 'src/myToken.html'),
            chunks: ['myToken'],
        }),
        new HtmlWebpackPlugin({
            filename: 'sig.html',
            template: path.resolve(__dirname, 'src/sigIndex.html'),
            chunks: ['sig'], //配置html需要引入的chunk
        }),
        new HtmlWebpackPlugin({
            filename: 'fairIntegerSep.html',
            template: path.resolve(__dirname, 'src/fairIntegerSep.html'),
            chunks: ['fairIntegerSep'], //配置html需要引入的chunk
        }),
        new HtmlWebpackPlugin({
            filename: 'fairIntegerAuto.html',
            template: path.resolve(__dirname, 'src/fairIntegerAuto.html'),
            chunks: ['fairIntegerAuto'], //配置html需要引入的chunk
        }),
        new NodePolyfillPlugin(),
    ],
    // 不会输出资源，在内存中打包
    // 开启dev server可以访问dist目录中的文件，默认为index.html
    devServer: {
        host: 'localhost', // 启动服务器域名
        port: '8000', // 启动服务器端口号
        open: true, // 是否自动打开浏览器
        compress: true,
    },
};
