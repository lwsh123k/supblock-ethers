import express from 'express';
import http from 'http';
import cors from 'cors';
import routes from './routes'; // 引入路由
import { initSocket } from './socket';
import { record } from './contract/recordEvent';
import { getFairIntGen } from './contract/getContractInstance';
import { ethers } from 'ethers';
import { validatorListen } from './contract/eventListen/validatorListen';

// 创建express和socketio
// express和socketio是运行在http服务器上的两套不同的东西, 用于处理请求和长连接.
// Socket.IO 默认监听  /socket.io  路径
const app = express();
const server = http.createServer(app);

// 中间件
app.use(cors());

app.use(express.json());

// 使用路由
app.use('/', routes);

// 初始化socket
initSocket(server);

// 监听并记录随机数; 双方上传随机数完成时, 告诉插件打开新页面
record();
validatorListen();

// 启动服务器
server.listen(3000, function () {
    console.log('服务器已启动');
});
