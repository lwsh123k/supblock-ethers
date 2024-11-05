import http from 'http';
import { Server, Socket } from 'socket.io';
import { authString } from '../routes/authentication';
import { ethers } from 'ethers';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { logger } from '../util/logger';
import { onlineUsers } from './usersData';
import { useAuthMiddleware } from './middleware';
import {
    handleChainConfirmation,
    handleChainInit,
    handleFinalData,
    handleValidator2Next,
} from './handleValidator';
import { AppBlindUpload, handleAppBlindUpload, hashToBMapping } from './handlePluginMessage';
import { AppBlindedAddress, AppToRelayData, PreToNextRelayData } from './types';
// For the client library
import ioClient from 'socket.io-client';
import { signBlindedAddress } from './eccBlind';
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
    const serverSocket = ioClient('http://localhost:3000', {
        reconnectionAttempts: 5,
        reconnectionDelay: 5000,
        query: {
            address: 'validator',
        },
    });

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
            ' applicant send blinded address',
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

        // chain initialization 第二三次从"applicant to validator: initialization data"获取t
        socket.on('applicant to validator: initialization data', (data) => {
            handleChainInit(socket, data);
        });
        // chain initialization 申请者第一次从"applicant send blinded address"获取t
        socket.on('applicant send blinded address', async (data: AppBlindedAddress) => {
            await signBlindedAddress(socket, data);
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

        // final confirmation
        socket.on('applicant to validator: chain confirmation', async (data: AppToRelayData) => {
            await handleChainConfirmation(socket, data);
        });
    });
}
