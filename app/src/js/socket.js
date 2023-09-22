import { io } from 'socket.io-client';

class SocketModule {
    // 单例模式
    constructor() {
        if (!SocketModule.instance) {
            this.socket = this.socket = io('http://localhost:3000');
            SocketModule.instance = this;
        }
        return SocketModule.instance;
    }

    send(event, data) {
        this.socket.emit(event, data);
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

export { SocketModule };
