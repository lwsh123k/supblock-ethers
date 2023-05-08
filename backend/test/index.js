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



app.use(cors());
app.get('/', function(req, res) {
   res.send("{1:'w'}");
});

//Whenever someone connects this gets executed
io.on('connection', function(socket) {
   console.log('用户已连接');

   //Whenever someone disconnects this piece of code executed
   socket.on('disconnect', function () {
      console.log('用户已断开连接');
   });
});

httpServer.listen(3000, "127.0.0.1", () => {
   console.log('服务已启动');
});
