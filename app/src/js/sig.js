import { io } from 'socket.io-client';
import ecc from './eccBlind.js';

const sig = {
    socket: null,

    start() {
        this.socket = io('http://localhost:3000');
        ////////////////////////监听事件////////////////////////////////////////
        // 监听其他用户加入
        socket.on('join', function (username) {
            console.log('用户 ' + username + ' 加入了房间');
            addMessage(username + ' 加入了房间');
        });

        //别人请求自己的公钥
        socket.on('request public key', function (data) {
            let publicKey = ecc.getPublicKey();
            let res = {};
            Object.assign(res, publicKey, { from: data.to, to: data.from });
            socket.emit('response public key', res);
        });

        //收到别人发给自己的公钥
        socket.on('response public key', function (data) {
            ecc.deconPublicKey(data.Rx, data.Ry, data.Px, data.Py);
            addMessage('收到来自 ' + data.from + ' 的公钥' + data.Rx);
        });

        // 监听 对方不在线 事件
        socket.on('not online', function (data) {
            console.log('用户 ' + data.from + ' 发送了私聊消息给 ' + data.to + ': ' + data.message);
            addMessage('请求方暂时不在线');
        });
    },

    //请求别人，获取公钥
    getPublicKey() {
        let from = document.getElementById('username').value;
        let to = document.getElementById('to').value;
        this.socket.emit('request public key', { from: from, to: to });
        addMessage('你向用户 ' + to + ' 请求了公钥');
    },

    //////////////////////////////////获取签名部分//////////////////////////////////
    // 请求签名
    getSig() {
        let from = document.getElementById('username').value;
        let to = document.getElementById('to').value;
        let message = document.getElementById('message').value;
        let cBlinded_c = ecc.blindMessage(message); //返回cBlinded和c
        let blindMessage = cBlinded_c.cBlinded;
        this.socket.emit('request sig', { from: from, to: to, blindMessage: blindMessage });
        addMessage('你向用户 ' + to + ' 请求了签名');
        addMessage('c:' + cBlinded_c.c);
    },

    //////////////////////////////验证签名////////////////////////////////////////
    verifySig() {
        let message = document.getElementById('message').value;
        let c = document.getElementById('c').value;
        let s = document.getElementById('s').value;
        let t = document.getElementById('t').value;
        let result = ecc.verifySig(message, c, s, t).result;
        addMessage('结果：' + result);
    },

    //////////////////////////////其他事件////////////////////////////////////////

    // 加入房间
    joinRoom() {
        const username = document.getElementById('username').value;
        if (username) {
            socket.emit('join', { username: username });
        }
    },

    // 添加消息到聊天记录
    addMessage(message) {
        const ul = document.getElementById('messages');
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(message));
        ul.appendChild(li);
    },
};

window.addEventListener('DOMContentLoaded', async () => {
    sig.start();

    // 加入房间
    document.querySelector('addBtn').addEventListener('click', () => {
        sig.joinRoom();
    });

    // 获得公钥
    document.querySelector('getPublicKeyBtn').addEventListener('click', () => {
        sig.getPublicKey();
    });

    // 获得签名
    document.querySelector('getSigBtn').addEventListener('click', () => {
        sig.getSig();
    });

    // 验证签名
    document.querySelector('verifySigBtn').addEventListener('click', () => {
        sig.verifySig();
    });
});
