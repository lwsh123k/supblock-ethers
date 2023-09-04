import { io } from 'socket.io-client';

// 模拟错误上传
const communication = {
    // 创建一个新的 通过验证的socket
    createSocket(address, message, signedMessage) {
        return io('http://localhost:3000', {
            auth: {
                token: { address, message, signedMessage },
            },
        });
    },
};

export default communication;
