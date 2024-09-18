import http from 'http';
import { Server, Socket } from 'socket.io';
import { authString } from '../routes/authentication';
import { ethers } from 'ethers';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { logger } from '../util/logger';
import { onlineUsers } from './users';
import { useAuthMiddleware } from './middleware';
import {
    AppToRelayData,
    handleChainInit,
    handleFinalData,
    handleValidator2Next,
    PreToNextRelayData,
} from './handleValidator';
import { AppBlindUpload, handleAppBlindUpload, hashToBMapping } from './handlePluginMessage';

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

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

    // 认证中间件, socket登录需要user使用私钥加密字符串，服务器端通过公钥验证
    io.use(useAuthMiddleware);

    io.on('connection', function (socket) {
        // 监听特定事件, 特定事件触发

        // 除了特定事件, 其他的都会转发
        let excludeEvent = [
            'join',
            'pluginConnection',
            'applicant to validator: initialization data',
            'new tab opening finished to validator',
            'blinding number',
            'applicant to validator: final data',
            'relay to validator: final data',
        ];
        socket.onAny((eventName, data) => {
            if (excludeEvent.includes(eventName)) return;
            const toSocket = onlineUsers[data.to];
            if (toSocket) {
                console.log('from: ', data.from, '\nto: ', data.to, '\ndata:', data);
                toSocket.emit(eventName, data);
            }
        });

        // applicant to server: blinding number, 用于之后的插件打开新页面
        socket.on('blinding number', (data: AppBlindUpload) => {
            console.log('blinding number call back function');
            handleAppBlindUpload(data);
        });

        // app to relay: chain initialization
        socket.on('applicant to validator: initialization data', (data) => {
            handleChainInit(socket, data); //1111
        });

        // plugin to validator, validator收到plugin打开新页面的信息之后, 给下一个relay发送信息
        socket.on('new tab opening finished to validator', async (data) => {
            await handleValidator2Next(socket, data);
        });

        // applicant send final data to validator
        socket.on('applicant to validator: final data', async (data: AppToRelayData) => {
            await handleFinalData(socket, data);
        });
        // relay send final data to validator
        socket.on('relay to validator: final data', async (data: PreToNextRelayData) => {
            await handleFinalData(socket, data);
        });
    });
}
