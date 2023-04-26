const path = require("path")


// 测试path.resolve()用法
console.log(path.resolve(__dirname)); 
console.log(path.resolve('/dist')); 
console.log(path.resolve(__dirname, '/dist')); 
