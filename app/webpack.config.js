const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// npm run build
// npm run dev
module.exports = {
  mode: 'development',
  entry: "./src/index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    // 拷贝文件到指定目录
    new CopyWebpackPlugin({
      patterns: [
      { from: "./src/index.html", to: "index.html" },    
      ],
    })
  ],
  devServer: { contentBase: path.join(__dirname, "dist"), compress: true },
};
