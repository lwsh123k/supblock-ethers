import { io } from 'socket.io-client';
import ecc from './eccBlind.js';
import sigContract from './sigContract.js';

const sig = {
    socket: null,
    ni: null,
    ri: null,
    hash: null,

    start(socket) {
        this.socket = socket;
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

        //响应者：上传hash, 发送公开随机数请求
        this.socket.on('upload hash', async (data) => {
            let addressA = data.from;
            let addressB = data.to;
            let result = await sigContract.getResExecuteTime(addressA);
            let tA = result[0].toNumber();
            let tB = result[1].toNumber();

            this.ni = Math.floor(Math.random() * 100);
            this.ri = sigContract.generateRandomBytes(32);
            this.hash = sigContract.getHash(this.ni, tA, tB, this.ri);
            await sigContract.setResHash(addressA, this.hash);
            // 通过socket通知对方上传
            this.socket.emit('reveal random number from res', { from: addressB, to: addressA });
            this.addMessage(
                `ni: ${this.ni}, tA: ${tA}, tB: ${tB}, ri: ${this.ri}, hash: ${this.hash}`
            );
            this.addMessage(`响应者hash:${this.hash}已上传`);
        });

        //请求者：上传随机数ni和ri, 向响应者发送公开随机数请求
        this.socket.on('reveal random number from res', async (data) => {
            let addressA = data.to;
            let addressB = data.from;
            await sigContract.setReqInfo(addressB, this.ni, this.ri);
            // 通过socket通知对方上传
            this.socket.emit('reveal random number from req', { from: addressA, to: addressB });
            this.addMessage('请求者ni ri已上传');
        });

        //响应者：上传随机数ni和ri, 向响应者发送公开随机数请求
        this.socket.on('reveal random number from req', async (data) => {
            let addressA = data.from;
            let addressB = data.to;
            await sigContract.setResInfo(addressA, this.ni, this.ri);
            // 通过socket通知对方上传
            this.socket.emit('reveal random number success', { from: addressB, to: addressA });
            this.addMessage('请求者ni ri已上传');
        });

        //请求者：上传随机数ni和ri, 向响应者发送公开随机数请求
        this.socket.on('reveal random number success', async (data) => {
            this.addMessage('响应者ni ri已上传');
        });

        // 监听 对方不在线 事件
        this.socket.on('not online', (data) => {
            console.log('用户 ' + data.from + ' 发送了私聊消息给 ' + data.to + ': ' + data.message);
            this.addMessage('请求方暂时不在线');
        });
    },

    // 生成随机数,计算hash,上传自己计算的的hash,并请求对方上传hash
    async randomHashReq(addressA, addressB) {
        // 获取双方已经成功执行的次数
        let result = await sigContract.getReqExecuteTime(addressB);
        let tA = result[0].toNumber();
        let tB = result[1].toNumber();

        // 挑选随机数ni, 0 <= ni < 100. Math.random()方法返回一个0（包括）到1（不包括）之间的随机浮点数
        this.ni = Math.floor(Math.random() * 100);
        // 挑选混淆值ri, 0 <= ri < 2^256
        this.ri = sigContract.generateRandomBytes(32);
        // 取hash, 上传
        this.hash = sigContract.getHash(this.ni, tA, tB, this.ri);
        await sigContract.setReqHash(addressB, this.hash);
        // 通过socket通知对方上传
        this.socket.emit('upload hash', { from: addressA, to: addressB });
        this.addMessage(`ni: ${this.ni}, tA: ${tA}, tB: ${tB}, ri: ${this.ri}, hash: ${this.hash}`);
        this.addMessage(`请求者hash:${this.hash}已上传`);
    },

    // 验证上传的随机数
    async verifyRandom() {
        let sender = document.getElementById('verify-sender').value;
        let receiver = document.getElementById('verify-receiver').value;
        let index = document.getElementById('verify-index').value;
        let result = await sigContract.verifyInfo(sender, receiver, index);
        this.addMessage(`result:${result}`);
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

    // 输入私钥获得地址，连接钱包、设置为ecc的私钥(地址和私钥统一带0x前缀)
    document.querySelector('#getAddressButton').addEventListener('click', async function () {
        // 为wallet、ecc设置私钥
        let private_key = document.querySelector('#private_key').value;
        sigContract.getWallet(private_key);
        let addr = sigContract.wallet.address;

        // 显示自己的地址、使用address加入房间
        let addressSpan = document.getElementById('addressSpan');
        addressSpan.innerText = '地址：' + addr;
        sig.joinRoom(addr);
    });

    // 请求对方上传随机数
    document.querySelector('#randomGenButton').addEventListener('click', () => {
        let addressA = sigContract.wallet.address;
        let addressB = document.getElementById('receiver').value;
        sig.randomHashReq(addressA, addressB);
    });

    // 获得签名方公钥
    document.querySelector('#verifyRandomBtn').addEventListener('click', () => {
        sig.verifyRandom();
    });
});
