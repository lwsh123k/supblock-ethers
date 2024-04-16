import http from 'http';
import { Server, Socket } from 'socket.io';
import { authString } from '../routes/authentication';
import { ethers } from 'ethers';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
const onlineUsers: { [propName: string]: Socket } = {};

type AuthInfo = {
    address: string;
    signedAuthString: string;
};

export function initSocket(
    server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
) {
    io = new Server(server, {
        cors: {
            // origin: ['http://127.0.0.1:5500', 'http://localhost:8000', 'http://localhost:8080'], // []和*不能同时使用
            origin: '*',
        },
    });

    // 认证中间件
    io.use((socket, next) => {
        const info = socket.handshake.query as AuthInfo;
        // console.log(socket.handshake);
        let address = info.address;
        if (address === 'plugin') {
            console.log(`用户${address}加入`);
            onlineUsers[address] = socket;
            next();
        } else {
            let signedAuthString = info.signedAuthString;
            if (address && authString.has(address) && signedAuthString) {
                let res =
                    address ===
                    ethers.utils.verifyMessage(authString.get(address) as string, signedAuthString);
                if (res) {
                    console.log(`用户${address}加入`);
                    onlineUsers[address] = socket;
                    next();
                }
            }
        }
    });

    io.on('connection', function (socket) {
        // console.log('有用户连接: ' + socket.id);

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
}

// 将双方上传随机数完成的消息发送给插件
// 监听随机数上传, 并将信息告诉extension, extension打开新页面, 告诉applicant和relay可以发送信息了
export function sendPluginMessage(addressA: string, addressB: string, fairIntegerNumber: number) {
    let pluginSocket = onlineUsers['plugin'];
    // 请求打开新页面, partner是指: 响应者, 此时请求者和响应者都需要给next relay发送消息.
    pluginSocket.emit('open a new tab', {
        from: addressA,
        to: 'plugin',
        partner: addressB,
        number: fairIntegerNumber,
        url: 'http://localhost:5173/bridge',
    });
}
