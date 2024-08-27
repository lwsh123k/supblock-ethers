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

// 存储r => { applicant temp address, blindlingNumber } 的映射
let hashToBMapping = new Map<
    string,
    { blindingNumber: number; tempAccount: string; relayAccount: string }
>();
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
            (data: {
                blindingNumber: number;
                tempAccount: string;
                relayAccount: string;
                hash: string;
            }) => {
                let { blindingNumber, tempAccount, relayAccount, hash } = data;
                hashToBMapping.set(hash, {
                    blindingNumber,
                    tempAccount,
                    relayAccount,
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
    hashA: string
) {
    // server会检测applicant和relay上传随机数, 会调用2次sendPluginMessage, 避免同一页面打开两次
    if (hasOpened.has(hashA)) return;
    hasOpened.set(hashA, true);

    // fair integer = (blinding number + joint random number selection) % 100
    let blindingNumber;
    if (!hashToBMapping.has(hashA)) {
        throw new Error('blinding number does not exist');
    } else blindingNumber = hashToBMapping.get(hashA)?.blindingNumber!;
    let blindedFairIntNum = (fairIntegerNumber + blindingNumber) % 100;

    // send to plugin
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
            blindedFairIntNum: blindedFairIntNum,
            fairIntegerNumber,
            blindingNumber,
            hashOfApplicant: hashA,
            url: 'http://localhost:5173/bridge',
        });
    } else logger.error('plugin not connect');
}
