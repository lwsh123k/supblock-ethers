import http from 'http';
import { Server, Socket } from 'socket.io';
import { authString } from '../routes/authentication';
import { ethers } from 'ethers';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { logger } from '../util/logger';

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
const onlineUsers: { [propName: string]: Socket } = {};

type AuthInfo = {
    address: string;
    signedAuthString: string;
};

let blindingNumberMap = new Map<string, number>(); // 存储applicant temp address => blindlingNumber的映射
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
            logger.info(`user ${address} join`);
            onlineUsers[address] = socket;
            next();
        } else {
            let signedAuthString = info.signedAuthString;
            if (address && authString.has(address) && signedAuthString) {
                let res =
                    address ===
                    ethers.utils.verifyMessage(authString.get(address) as string, signedAuthString);
                if (res) {
                    logger.info(`user ${address} join`);
                    onlineUsers[address] = socket;
                    next();
                }
            }
        }
    });

    io.on('connection', function (socket) {
        // 监听特定事件, 特定事件触发
        // applicant一开始将blinding number发送给服务器端, 用于之后的插件打开新页面
        // fair integer = (blinding number + joint random number selection) % 100
        socket.on(
            'blinding number',
            (data: { blindingNumber: number[]; tempAccountAddress: string[] }) => {
                logger.info(data, 'blinding number');
                let { blindingNumber, tempAccountAddress } = data;
                tempAccountAddress.map((value, index) => {
                    blindingNumberMap.set(value, blindingNumber[index]);
                });
            }
        );

        // 监听所有事件, 任何事件都会触发
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
// 避免extension重复打开页面
let hasOpened = new Map<string, boolean>();
export function sendPluginMessage(
    applicant: string,
    relay: string,
    fairIntegerNumber: number,
    hash?: { hashA: string; hashB: string }
) {
    // 避免打开两次
    if (hash) {
        if (hasOpened.has(hash.hashA)) return;
        hasOpened.set(hash.hashA, true);
        hasOpened.set(hash.hashB, true);
    }
    // fair integer = (blinding number + joint random number selection) % 100
    if (!blindingNumberMap.has(applicant)) throw new Error('blinding number does not exist');
    fairIntegerNumber = (fairIntegerNumber + blindingNumberMap.get(applicant)!) % 100;

    let pluginSocket = onlineUsers['plugin'];
    // 请求打开新页面, partner是指: 响应者, 此时请求者和响应者都需要给next relay发送消息.
    pluginSocket.emit('open a new tab', {
        from: 'server',
        to: 'plugin',
        applicant,
        relay,
        number: fairIntegerNumber,
        url: 'http://localhost:5173/bridge',
    });
}
