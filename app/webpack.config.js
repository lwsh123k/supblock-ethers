const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// npm run build  npx webpack
// npm run dev    npx webpack server
module.exports = {
    mode: 'development',
    entry: './src/js/myToken.js',
    output: {
        filename: 'index.js',
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
        }),
    ],
    // 不会输出资源，在内存中打包
    devServer: {
        host: 'localhost', // 启动服务器域名
        port: '3000', // 启动服务器端口号
        open: true, // 是否自动打开浏览器
        compress: true,
    },
};
