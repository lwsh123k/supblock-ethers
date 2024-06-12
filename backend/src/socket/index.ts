import http from 'http';
import { Server, Socket } from 'socket.io';
import { authString } from '../routes/authentication';
import { ethers } from 'ethers';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { logger } from '../util/logger';
import { onlineUsers } from './users';
import { useAuthMiddleware } from './middleware';
import { handleChainInit, handleValidator2Next } from './handleValidator';

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

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

    // 认证中间件, socket登录需要user使用私钥加密字符串，服务器端通过公钥验证
    io.use(useAuthMiddleware);

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

        // 除了特定事件, 其他的都会转发
        let excludeEvent = [
            'join',
            'pluginConnection',
            'applicant to validator: initialization data',
            'new tab opening finished to validator',
        ];
        socket.onAny((eventName, data) => {
            if (excludeEvent.includes(eventName)) return;
            const toSocket = onlineUsers[data.to];
            if (toSocket) {
                console.log('from: ', data.from, '\nto: ', data.to, '\ndata:', data);
                toSocket.emit(eventName, data);
            }
        });

        // app to relay: chain initialization
        socket.on('applicant to validator: initialization data', (data) => {
            handleChainInit(socket, data);
        });

        // plugin to validator, validator收到plugin打开新页面的信息之后, 给下一个relay发送信息
        socket.on('new tab opening finished to validator', async (data) => {
            await handleValidator2Next(socket, data);
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
    if (pluginSocket) {
        // 将validator改到server side, plugin将打开新页面的信息回送到server
        if (relay === '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba') relay = 'validator';
        pluginSocket.emit('open a new tab', {
            from: 'server',
            to: 'plugin',
            applicant,
            relay,
            number: fairIntegerNumber,
            url: 'http://localhost:5173/bridge',
        });
    } else logger.error('plugin not connect');
}
