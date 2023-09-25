const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { ethers } = require('ethers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://127.0.0.1:5500', 'http://localhost:8000'],
    },
});

// 中间件
app.use(cors());
app.use(express.json());

// 生成随机认证字符串, 将address和random string保存到mapping中
const authString = new Map();
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

const onlineUsers = {};
io.on('connection', function (socket) {
    console.log('有用户连接: ' + socket.id);

    // 加入socket需要通过认证
    socket.on('join', function (data) {
        let address = data.address;
        let signedAuthString = data.signedAuthString;
        if (address && authString.has(address) && signedAuthString) {
            let res =
                address === ethers.utils.verifyMessage(authString.get(address), signedAuthString);
            if (res) {
                // console.log('用户 ' + address + ' 加入');
                onlineUsers[address] = socket;
            }
        }
    });

    // 转发任意信息
    socket.onAny((eventName, data) => {
        if (eventName === 'join') return;
        const toSocket = onlineUsers[data.to];
        if (toSocket) {
            console.log(data.from, '   ', data.to, data);
            toSocket.emit(eventName, data);
        }
    });
});

// 启动服务器
server.listen(3000, function () {
    console.log('服务器已启动');
});
