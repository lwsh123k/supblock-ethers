const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: [
            'http://localhost:8000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://127.0.0.1:8000',
        ], // 允许跨域访问的源
    },
});

// 存储在线用户的Socket对象
const onlineUsers = {};

// 监听连接事件
io.on('connection', function (socket) {
    console.log('有用户连接: ' + socket.id);

    // 监听加入房间事件
    socket.on('join', function (data) {
        console.log('用户 ' + data.username + ' 加入了房间');
        // 存储在线用户,并广播消息
        onlineUsers[data.username] = socket;
        io.emit('join', data.username);
    });

    // 转发任意信息
    socket.onAny((eventName, data) => {
        if (eventName === 'join') return;
        const toSocket = onlineUsers[data.to];
        if (toSocket) {
            toSocket.emit(eventName, data);
        }
    });
});

// 启动服务器
httpServer.listen(3000, function () {
    console.log('服务器已启动');
});
