import { io } from 'socket.io-client';
import sigContract from './sigContract.js';
import auth from './auth.js';

class SocketModule {
    constructor() {
        this.socket = io('http://localhost:3000');
    }

    // 加入socket
    async joinRoom(privateKey) {
        let address = sigContract.getAddress(privateKey);
        let authString = await auth.getAuthString(address);
        let signedAuthString = await sigContract.getSign(authString, privateKey);
        console.log(typeof authString, signedAuthString);
        this.socket.emit('join', { address, signedAuthString });
    }

    send(message) {
        this.socket.emit('message', message);
    }

    receive(callback) {
        this.socket.on('message', (data) => {
            callback(data);
        });
    }

    performSpecificAction(data) {
        // 执行特定操作
        // 这里根据接收到的消息内容执行相应的操作
        if (data === 'command1') {
            // 执行操作1
        } else if (data === 'command2') {
            // 执行操作2
        } else {
            // 处理其他情况
        }
    }

    disconnect() {
        this.socket.disconnect();
    }
}

module.exports = SocketModule;
