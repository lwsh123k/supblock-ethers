const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require('cors');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
   cors: {
      origin: "http://127.0.0.1:5500", // 允许跨域访问的源
    }
});

// 存储在线用户的Socket对象
const onlineUsers = {};

// 监听连接事件
io.on('connection', function(socket) {
    console.log('有用户连接: ' + socket.id);

    // 监听加入房间事件
    socket.on('join', function(data) {
    console.log('用户 ' + data.username + ' 加入了房间');
    // 存储在线用户
    onlineUsers[data.username] = socket;
    // 广播消息，通知所有用户
    io.emit('join', data.username);
  });

  // 监听私聊事件
  socket.on('private message', function(data) {
    console.log('用户 ' + data.from + ' 发送了私聊消息给 ' + data.to + ': ' + data.message);
    // 获取接收者的Socket对象
    const toSocket = onlineUsers[data.to];
    // 将消息发送给接收者
    if (toSocket) {
      toSocket.emit('private message', data);
    }
  });

  // 监听断开连接事件
  socket.on('disconnect', function() {
    console.log('有用户断开连接: ' + socket.id);
    // 从在线用户列表中移除用户
    Object.keys(onlineUsers).forEach(function(username) {
      if (onlineUsers[username] === socket) {
        delete onlineUsers[username];
        // 广播消息，通知所有用户
        io.emit('leave', username);
      }
    });
  });
});

// 启动服务器
httpServer.listen(3000, function() {
  console.log('服务器已启动');
});
