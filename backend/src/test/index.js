const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ['http://127.0.0.1:5500', 'http://localhost:8000'],
    },
});

app.use(cors());
app.use(express.json());
app.get('/', function (req, res) {
    res.send("{1:'w'}");
});

const authString = new Map();
app.post('/getAuthString', (req, res) => {
    if (!req.body.publicKey) return;
    let publicKey = req.body.publicKey;
    console.log(111);
    if (!authString.has(publicKey)) {
        let randomUUID = uuidv4();
        authString.set(publicKey, randomUUID);
    }

    console.log(`Generated UUID: ${authString.get(publicKey)}`);
    res.json({ message: authString.get(publicKey) });
});

//Whenever someone connects this gets executed
io.on('connection', function (socket) {
    console.log('用户已连接');

    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
        console.log('用户已断开连接');
    });
});

httpServer.listen(3000, '127.0.0.1', () => {
    console.log('服务已启动');
});
