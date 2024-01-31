import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import routes from './routes'; // 引入路由
import { FairIntegerContract } from './contract-interaction/listenEvent';

// 创建express和socketio
// express和socketio是运行在http服务器上的两套不同的东西, 用于处理请求和长连接.
// Socket.IO 默认监听  /socket.io  路径
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // origin: ['http://127.0.0.1:5500', 'http://localhost:8000', 'http://localhost:8080'], // []和*不能同时使用
        origin: '*',
    },
});

// 中间件
app.use(cors());
app.use(express.json());

// 生成随机认证字符串, 将address和random string保存到mapping中
const authString: Map<string, string> = new Map();
app.post('/getAuthString', (req, res) => {
    if (!req.body.address) return;
    let address = req.body.address;
    if (!authString.has(address)) {
        // 32位16进制字符串, 如: f83e2ead-1aac-4439-8a6e-7f29db8c916d
        let randomUUID = uuidv4();
        authString.set(address, randomUUID);
    }
    res.json({ message: authString.get(address) });
});
// 获取公钥
app.use('/', routes);

const onlineUsers: { [propName: string]: Socket } = {};
io.on('connection', function (socket) {
    console.log('有用户连接: ' + socket.id);

    // 用户连接, 需要通过认证
    socket.on('join', function (data) {
        let address: string = data.address;
        let signedAuthString = data.signedAuthString;
        if (address && authString.has(address) && signedAuthString) {
            let res =
                address ===
                ethers.utils.verifyMessage(authString.get(address) as string, signedAuthString);
            if (res) {
                // console.log('用户 ' + address + ' 加入');
                onlineUsers[address] = socket;
            }
        }
    });

    // 插件连接到socket
    // 考虑到plugin只是起到辅助作用, 不做认证加密处理
    socket.on('pluginConnection', () => {
        onlineUsers['plugin'] = socket;
        console.log('plugin 已加入到socket user storage object');
    });

    // 转发任意信息
    socket.onAny((eventName, data) => {
        if (['join', 'pluginConnection'].includes(eventName)) return;
        const toSocket = onlineUsers[data.to];
        if (toSocket) {
            console.log('from: ', data.from, '\nto: ', data.to, '\ndata:', data);
            toSocket.emit(eventName, data);
        }
    });
});

// 监听随机数上传, 并将信息告诉extension, extension打开新页面, 告诉applicant和relay可以发送信息了
let sendPluginMessage = (addressA: string, addressB: string, fairIntegerNumber: number) => {
    let pluginSocket = onlineUsers['plugin'];
    // 请求打开新页面, partner是指: 响应者, 此时请求者和响应者都需要给next relay发送消息.
    pluginSocket.emit('open a new tab', {
        from: addressA,
        to: 'plugin',
        partner: addressB,
        number: fairIntegerNumber,
        url: 'http://localhost:8000/fairIntegerSep.html',
    });
};
let fairIntegerContract = new FairIntegerContract();
fairIntegerContract.listenNumUpload(sendPluginMessage);

// 启动服务器
server.listen(3000, function () {
    console.log('服务器已启动');
});
