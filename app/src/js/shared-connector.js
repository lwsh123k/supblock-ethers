import { io } from 'socket.io-client';
import { ethers } from 'ethers';

class SharedConnector {
    // 单例模式
    constructor() {
        this.provider = null;
        this.socket = null;
    }

    // shared socket
    getSocket(socketUrl) {
        if (!this.socket) this.socket = io(socketUrl);
        return this.socket;
    }

    // shared eth provider
    getProvider(providerUrl) {
        if (!this.provider) {
            if (window.ethereum) this.provider = new ethers.providers.Web3Provider(window.ethereum);
            else this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
        }
        return this.provider;
    }

    // socket方法
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

export { SharedConnector };
