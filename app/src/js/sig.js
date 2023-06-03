import { io } from 'socket.io-client';
import ecc from './eccBlind.js';
import sigContract from './sigContract.js';

const sig = {
    socket: null,

    start() {
        this.socket = io('http://localhost:3000');
        ////////////////////////监听事件////////////////////////////////////////
        // 监听其他用户加入
        this.socket.on('join', (username) => {
            // console.log('用户 ' + username + ' 加入了房间');
            this.addMessage('地址:' + username + '加入了房间');
        });

        //响应者：别人请求自己的公钥
        this.socket.on('request public key', (data) => {
            let publicKey = ecc.getPublicKey();
            let res = {};
            Object.assign(res, publicKey, { from: data.to, to: data.from });
            this.socket.emit('response public key', res);
        });

        //请求者：收到别人发给自己的公钥
        this.socket.on('response public key', (data) => {
            ecc.deconPublicKey(data.Rx, data.Ry, data.Px, data.Py);
            // this.addMessage('收到来自 ' + data.from + ' 的公钥' + data.Rx);
            this.addMessage('收到来自 ' + data.from + ' 的公钥');
        });

        //响应者：别人请求自己的签名
        this.socket.on('request sig', async (data) => {
            console.log(data.blindMessage);
            let blindSig = ecc.getSig(data.blindMessage);
            let res = {};
            Object.assign(res, blindSig, { from: data.to, to: data.from });

            //将签名信息存储到区块链  异步？？？
            let px = '0x' + ecc.P_self.affineX.toHex();
            let py = '0x' + ecc.P_self.affineY.toHex();
            let s = '0x' + res.sBlind;
            let t = '0x' + res.t;
            console.log('px:', px);
            console.log('py:', py);
            console.log('sender:', res.to);
            console.log('receiver:', res.from);
            await sigContract.setResponseSig(res.to, s, t, px, py);

            // 将签名信息发送回请求者
            this.socket.emit('response sig', res);
        });

        //请求者：收到别人发给自己的签名
        this.socket.on('response sig', (data) => {
            this.addToTable('响应者', data.from);
            this.addToTable('s(未去除盲因子)', data.sBlind);
            let sig = ecc.unblindSig(data.sBlind);
            this.addToTable('s(已去除盲化因子)', sig.s);
            this.addToTable('t(随机数)', data.t);
            this.addToTable('<button id="verifyWithTable">验证</button>', '');
            document
                .querySelector('#verifyWithTable')
                .addEventListener('click', this.verifyWithTable);
        });

        // 监听 对方不在线 事件
        this.socket.on('not online', (data) => {
            console.log('用户 ' + data.from + ' 发送了私聊消息给 ' + data.to + ': ' + data.message);
            this.addMessage('请求方暂时不在线');
        });
    },

    //请求别人，获取公钥
    getPublicKey() {
        let from = sigContract.wallet.address;
        let to = document.getElementById('to').value;
        this.socket.emit('request public key', { from: from, to: to });
        this.addMessage('你向用户 ' + to + ' 请求了公钥');
    },

    //////////////////////////////////获取签名部分//////////////////////////////////
    // 请求签名
    async getSig() {
        let from = sigContract.wallet.address;
        let to = document.getElementById('to').value;
        let message = document.getElementById('message').value;

        //盲化信息：返回cBlinded、deblind和c
        let { cBlinded: blindMessage, c: c, deblind: deblind } = ecc.blindMessage(message);

        // 表格展示
        let table = document.querySelector('table');
        this.clearTable(table);
        table.style.display = 'table';
        this.addToTable('请求者', from);
        this.addToTable('c', c);
        this.addToTable('盲因子deblind', deblind);
        // 将to, c, deblind, mHash存储到区块链
        let mHash = '0x' + ecc.keccak256(message);
        let deblindHash = '0x' + ecc.getNumberHash(deblind);
        let prefixc = '0x' + c;
        await sigContract.setSigAndLock(to, prefixc, deblindHash, mHash);
        // 更新余额
        let addr = sigContract.wallet.address;
        let bal = await sigContract.updateBalance(addr);
        let balanceSpan = document.getElementById('balanceSpan');
        balanceSpan.innerText = '余额:' + bal;

        // 请求签名
        this.socket.emit('request sig', { from: from, to: to, blindMessage: blindMessage });
    },

    //////////////////////////////验证签名////////////////////////////////////////
    async verifySig() {
        let receiver = document.getElementById('receiver').value;
        let message = document.getElementById('message').value;
        let c = '0x' + document.getElementById('c').value;
        let s = '0x' + document.getElementById('s').value;
        let t = '0x' + document.getElementById('t').value;
        let deblind = '0x' + document.getElementById('deblind').value;
        //let deblind = '0x' + ecc.deblind.toString(16),
        let sender = sigContract.wallet.address;
        // let result = ecc.verifySig(message, c, s, t).result;
        let info = {
            sender: sender,
            receiver: receiver,
            message: message,
            c: c,
            deblind: deblind,
            s: s,
            t: t,
            px: 0,
            py: 0,
        };
        let result = await sigContract.verifySig(info);
        this.addMessage('结果：' + result);
    },

    // 验证签名并解锁交易
    async unlock() {
        let receiver = document.getElementById('receiver').value;
        let message = document.getElementById('message').value;
        let c = '0x' + document.getElementById('c').value;
        let s = '0x' + document.getElementById('s').value;
        let t = '0x' + document.getElementById('t').value;
        let deblind = '0x' + document.getElementById('deblind').value;
        let sender = sigContract.wallet.address;
        let info = {
            sender: sender,
            receiver: receiver,
            message: message,
            c: c,
            deblind: deblind,
            s: s,
            t: t,
            px: 0,
            py: 0,
        };
        let result = await sigContract.vrifySigAndUnLock(info);
        // 更新余额
        let addr = sigContract.wallet.address;
        let bal = await sigContract.updateBalance(addr);
        let balanceSpan = document.getElementById('balanceSpan');
        balanceSpan.innerText = '余额:' + bal;
        this.addMessage('结果：' + result);
    },

    //////////////////////////////签名展示////////////////////////////////////////
    async showAll(to) {
        let res = await sigContract.getAllSigs(to);
    },

    //////////////////////////////其他事件////////////////////////////////////////

    // 加入房间
    joinRoom(username) {
        //const username = document.getElementById('username').value;
        if (username) {
            this.socket.emit('join', { username: username });
        }
    },

    // 添加消息到聊天记录
    addMessage(message) {
        const ul = document.getElementById('messages');
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(message));
        ul.appendChild(li);
    },

    // 向表格添加2列
    addToTable(message1, message2) {
        let table = document.querySelector('table');
        let tr = document.createElement('tr');
        let td1 = document.createElement('td');
        td1.innerHTML = message1;
        tr.appendChild(td1);
        if (message2 != undefined) {
            let td2 = document.createElement('td');
            td2.innerHTML = message2;
            tr.appendChild(td2);
        }
        table.appendChild(tr);
    },

    // 清空表格
    clearTable(myTable) {
        let rowCount = myTable.rows.length;
        for (let i = rowCount - 1; i >= 0; i--) {
            myTable.deleteRow(i);
        }
    },

    async verifyWithTable() {
        let myTable = document.getElementById('sigTable');
        // table由rows属性,row由cells属性
        myTable.lastElementChild.cells[1].innerText = 'pending';
        let rows = myTable.rows;

        let sender = rows[0].cells[1].innerText;
        console.log(rows[0].cells[1].innerText);
        let c = '0x' + rows[1].cells[1].innerText;
        let deblind = '0x' + rows[2].cells[1].innerText;
        let receiver = rows[3].cells[1].innerText;
        let s = '0x' + rows[4].cells[1].innerText;
        let t = '0x' + rows[6].cells[1].innerText;
        let message = document.getElementById('message').value;
        let info = {
            sender: sender,
            receiver: receiver,
            message: message,
            c: c,
            deblind: deblind,
            s: s,
            t: t,
            px: 0,
            py: 0,
        };
        let result = await sigContract.verifySig(info);
        myTable.lastElementChild.cells[1].innerText = result;
    },
};

window.addEventListener('DOMContentLoaded', async () => {
    // 初始化
    sig.start();
    sigContract.start();

    // 输入私钥获得地址，连接钱包、设置为ecc的私钥
    document.querySelector('#getAddressButton').addEventListener('click', async function () {
        // 为wallet、ecc设置私钥(不带0x)
        let private_key = document.querySelector('#private_key').value;
        ecc.setKey(private_key);
        sigContract.getWallet(private_key);
        let addr = sigContract.wallet.address;
        let bal = await sigContract.updateBalance(addr);

        // 显示自己的地址、使用address加入房间
        let addressSpan = document.getElementById('addressSpan');
        let balanceSpan = document.getElementById('balanceSpan');
        addressSpan.innerText = '地址：' + addr;
        balanceSpan.innerText = '余额:' + bal;
        sig.joinRoom(addr);
    });

    // 获得签名方公钥
    document.querySelector('#getPublicKeyBtn').addEventListener('click', () => {
        sig.getPublicKey();
    });

    // 获得签名
    document.querySelector('#getSigBtn').addEventListener('click', async () => {
        await sig.getSig();
    });

    // 验证签名
    document.querySelector('#verifySigBtn').addEventListener('click', () => {
        sig.verifySig();
    });

    // 验证签名并解锁交易
    document.querySelector('#unlockBtn').addEventListener('click', async () => {
        await sig.unlock();
    });
    // 查看所有签名
    document.querySelector('#showAllBtn').addEventListener('click', () => {
        let to = document.querySelector('#to_showAll').value;
        sig.showAll(to);
    });
});
