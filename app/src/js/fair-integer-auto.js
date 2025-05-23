import { io } from 'socket.io-client';
import ecc from './eccBlind.js';
import sigContract from './contract-interaction/fair-integer-contract.js';
import tokenChain from './token-chain.js';

// 自动上传
const sig = {
    socket: null,
    ni: null,
    ri: null,
    hash: null,
    reuploadIndex: null,
    myAddress: null,

    start() {
        this.socket = io('http://localhost:3000');
        ////////////////////////监听事件////////////////////////////////////////
        // 监听其他用户加入
        this.socket.on('join', (username) => {
            // console.log('用户 ' + username + ' 加入了房间');
            this.addMessage('地址:' + username + '加入了房间');
        });

        //////////////////////////////////fair integer: 显示对方上传成功部分//////////////////////////////////
        //响应者接收：显示请求者上传hash成功
        this.socket.on('req upload hash success', async (data) => {
            let addressA = data.from;
            this.clearMessage();
            let table = document.getElementById('numTable');
            this.clearTable(table);
            table.style.display = 'none';
            document.getElementById('receiver').value = data.from;
            this.addMessage(`请求者 ${data.from}: hash已上传`);
            // 自动上传时, 响应者收到对方hash上传成功就: 上传自己的hash; 上传自己的ni ri
            await this.randomHashRes(addressA, this.myAddress);
            await this.uploadNumRes(addressA, this.myAddress, this.ni, this.ri);
        });

        //请求者接收：显示响应者上传hash成功
        this.socket.on('res upload hash success', async (data) => {
            this.addMessage(`响应者 ${data.from}: hash已上传`);
        });

        //响应者接收：显示请求者上传ni ri成功
        this.socket.on('req reveal random number success', async (data) => {
            this.addMessage(`请求者: ni和ri已上传`);
        });

        //请求者接收：显示响应者上传ni ri成功
        this.socket.on('res reveal random number success', async (data) => {
            this.addMessage(`响应者: ni和ri已上传`);
        });

        // 响应者接收: 显示req重新上传了随机数, 并展示原因
        this.socket.on('req reupload random number success', async (data) => {
            let state = data.state;
            let table = document.getElementById('numTable');
            this.addMessage(`请求者: ni和ri已重新上传`);
            this.updateOneCell(table, 1, 1, 'ni ri已重新上传');

            console.log(state);
            if (state === 2 || state === 7) {
                this.updateOneCell(table, 2, 5, 'ni ri 错误');
            } else if (state === 4) {
                this.updateOneCell(table, 2, 5, 'ni ri 超时');
            }
        });

        // 请求者接收: 显示res重新上传了随机数, 并展示原因
        this.socket.on('res reupload random number success', async (data) => {
            let state = data.state;
            let table = document.getElementById('numTable');
            this.addMessage(`响应者: ni和ri已重新上传`);
            this.updateOneCell(table, 2, 1, 'ni ri已重新上传');

            if (state === 3 || state === 6) {
                this.updateOneCell(table, 1, 5, 'ni ri 错误');
            } else if (state === 5) {
                this.updateOneCell(table, 1, 5, 'ni ri 超时');
            }
        });

        //////////////////////////////////token chain: //////////////////////////////////
        this.socket.on('chain initialization from requester', (data) => {
            let chainData = data.chainData;
            this.addMessage(
                `r: ${chainData.r0}, hashForward: ${chainData.hashForward}, hashbackward: ${chainData.hashbackward}, b: ${chainData.b}`
            );
            let result = tokenChain.validateData(chainData.r0, chainData.hashForward);
            if (result) this.addMessage('chain initialization data is correct');
            else this.addMessage('chain initialization data is false');
        });

        // 监听 对方不在线 事件
        this.socket.on('not online', (data) => {
            console.log('用户 ' + data.from + ' 发送了私聊消息给 ' + data.to + ': ' + data.message);
            this.addMessage('请求方暂时不在线');
        });
    },

    //////////////////////////////////hash ni ri上传部分//////////////////////////////////
    // 请求者上传hash
    async randomHashReq(addressA, addressB) {
        // 获取双方已经成功执行的次数
        let result = await sigContract.getReqExecuteTime(addressB);
        let tA = result[0].toNumber();
        let tB = result[1].toNumber();
        this.reuploadIndex = result[2].toNumber();

        // 挑选随机数ni, 0 <= ni < 100. Math.random()方法返回一个0（包括）到1（不包括）之间的随机浮点数
        this.ni = Math.floor(Math.random() * 100);
        // 挑选混淆值ri, 0 <= ri < 2^256
        this.ri = sigContract.generateRandomBytes(32);
        // 取hash, 上传
        this.hash = sigContract.getHash(this.ni, tA, tB, this.ri);
        await sigContract.setReqHash(addressB, this.hash);
        // 监听nb rb
        let newni = Math.floor(Math.random() * 100);
        let newri = sigContract.generateRandomBytes(32);
        // 初始化表格
        let table = document.getElementById('numTable');
        table.style.display = 'table';
        this.clearTable(table);
        this.addOneLine(
            table,
            '',
            'ni',
            'requester execution time',
            'responder execution time',
            'ri',
            'state'
        );
        sigContract.listenResHash(addressA, addressB, this.ni, this.ri).then(async (result) => {
            let [isReupload, listenResult] = result;
            this.clearOneLine(table, 2);
            if (listenResult === true) {
                this.addMessage(`响应者hash已上传`);
                this.addOneLine(table, '响应者', 'hash已上传');
                // 自动上传时, 请求者监听到对方hash上传成功: 上传自己的ni ri; 更新表格状态
                await this.uploadNumReq(addressA, addressB, this.ni, this.ri);
            } else {
                this.addMessage(`响应者30s内未上传hash`);
                this.addOneLine(table, '响应者', '30s内未上传hash');
            }
        }, null);
        sigContract
            .listenResNum(addressA, addressB, this.reuploadIndex, newni, newri)
            .then((result) => {
                let [isReupload, listenResult, state] = result;
                // 重新上传, 通知对方, 便于对方表格展示
                if (isReupload === true) {
                    this.socket.emit('req reupload random number success', {
                        from: addressA,
                        to: addressB,
                        state: state,
                    });
                }
                // state: 2, 7
                if (listenResult === true && isReupload === true) {
                    this.addMessage(
                        `响应者上传错误ni ri, 请求者已重新上传, ni: ${newni}, ri: ${newri}`
                    );
                    this.updateOneCell(table, 1, 5, 'ni ri 已重新上传');
                    this.updateOneCell(table, 2, 1, 'ni ri 错误');
                    // state: 1
                } else if (listenResult === true && isReupload === false) {
                    this.addMessage(`响应者: ni和ri已上传`);
                    this.updateOneCell(table, 2, 1, 'ni ri已上传');
                    // state: 4
                } else if (listenResult === false && isReupload === true) {
                    this.addMessage(
                        `响应者未上传ni ri, 请求者已重新上传, ni: ${newni}, ri: ${newri}`
                    );
                    this.updateOneCell(table, 1, 5, 'ni ri 已重新上传');
                    this.updateOneCell(table, 2, 1, 'ni ri 超时');
                    // state: 0, 6
                } else if (listenResult === false && isReupload === false) {
                    if (state === 0) {
                        this.addMessage(`双方都未上传ni ri`);
                        this.updateOneCell(table, 1, 5, 'ni ri 未上传');
                        this.updateOneCell(table, 2, 1, 'ni ri 未上传');
                    } else if (state === 6) {
                        this.addMessage(`请求者: 上传错误ni ri`);
                        this.updateOneCell(table, 1, 5, 'ni ri 错误');
                    }
                }
            }, null);
        // 通过socket通知对方上传
        this.socket.emit('req upload hash success', { from: addressA, to: addressB });
        this.addOneLine(table, '请求者', this.ni, tA, tB, this.ri, 'hash已上传');

        this.clearMessage();
        this.addMessage(`ni: ${this.ni}, tA: ${tA}, tB: ${tB}, ri: ${this.ri}, hash: ${this.hash}`);
        this.addMessage(`请求者hash已上传`);
    },

    // 响应者上传hash
    async randomHashRes(addressA, addressB) {
        let result = await sigContract.getResExecuteTime(addressA);
        let tA = result[0].toNumber();
        let tB = result[1].toNumber();
        this.reuploadIndex = result[2].toNumber();

        this.ni = Math.floor(Math.random() * 100);
        this.ri = sigContract.generateRandomBytes(32);
        this.hash = sigContract.getHash(this.ni, tA, tB, this.ri);
        await sigContract.setResHash(addressA, this.hash);
        // console.log('响应者上传完成的时间: ', Date.now());
        // 监听na ra
        let newni = Math.floor(Math.random() * 100);
        let newri = sigContract.generateRandomBytes(32);

        sigContract
            .listenReqNum(addressA, addressB, this.reuploadIndex, newni, newri)
            .then((result) => {
                let [isReupload, listenResult, state] = result;
                if (isReupload === true) {
                    this.socket.emit('res reupload random number success', {
                        from: addressB,
                        to: addressA,
                        state: state,
                    });
                }
                if (listenResult === true && isReupload === true) {
                    this.addMessage(
                        `请求者上传错误ni ri, 响应者已重新上传, ni: ${newni}, ri: ${newri}`
                    );
                    this.updateOneCell(table, 1, 1, 'ni ri 错误');
                    this.updateOneCell(table, 2, 5, 'ni ri 已重新上传');
                } else if (listenResult === true && isReupload === false) {
                    this.addMessage(`请求者: ni和ri已上传`);
                    this.updateOneCell(table, 1, 1, 'ni ri已上传');
                } else if (listenResult === false && isReupload === true) {
                    this.addMessage(
                        `请求者未上传ni ri, 响应者已重新上传, ni: ${newni}, ri: ${newri}`
                    );
                    this.updateOneCell(table, 1, 1, 'ni ri 超时');
                    this.updateOneCell(table, 2, 5, 'ni ri 已重新上传');
                } else if (listenResult === false && isReupload === false) {
                    if (state === 0) {
                        this.addMessage(`双方都未上传ni ri`);
                        this.updateOneCell(table, 1, 1, 'ni ri 未上传');
                        this.updateOneCell(table, 2, 5, 'ni ri 未上传');
                    } else if (state === 7) {
                        this.addMessage(`响应者: 上传错误ni ri`);
                        this.updateOneCell(table, 2, 5, 'ni ri ✘');
                    }
                }
            }, null);

        // 通过socket通知对方上传成功
        // 初始化表格
        let table = document.getElementById('numTable');
        table.style.display = 'table';
        this.clearTable(table);
        this.addOneLine(
            table,
            '',
            'ni',
            'requester execution time',
            'responder execution time',
            'ri',
            'state'
        );
        // this.socket.emit('res upload hash success', { from: addressB, to: addressA });
        this.addOneLine(table, '请求者', 'hash已上传');
        this.addOneLine(table, '响应者', this.ni, tA, tB, this.ri, 'hash已上传');

        this.addMessage(`ni: ${this.ni}, tA: ${tA}, tB: ${tB}, ri: ${this.ri}, hash: ${this.hash}`);
        this.addMessage(`响应者hash已上传`);
    },

    // 请求者上传ni ri
    async uploadNumReq(addressA, addressB, ni, ri) {
        let res = await sigContract.setReqInfo(addressB, ni, ri);
        let table = document.getElementById('numTable');
        // 通过socket通知对方上传
        if (typeof res === 'boolean' && res === true) {
            this.addMessage(`请求者: ni和ri已上传`);
            this.updateOneCell(table, 1, 5, 'ni ri已上传');
            // this.socket.emit('req reveal random number success', { from: addressA, to: addressB });
        } else this.addMessage(res);
    },

    // 响应者上传ni ri
    async uploadNumRes(addressA, addressB, ni, ri) {
        let res = await sigContract.setResInfo(addressA, ni, ri);
        let table = document.getElementById('numTable');
        // 通过socket通知对方上传
        if (typeof res === 'boolean' && res === true) {
            this.addMessage(`响应者: ni和ri已上传`);
            this.updateOneCell(table, 2, 5, 'ni ri已上传');
            // this.socket.emit('res reveal random number success', { from: addressB, to: addressA });
        } else this.addMessage(res);
    },

    // 显示选择的随机数
    async showRandom(sender, receiver, index) {
        try {
            let result = await sigContract.showNum(sender, receiver, index);
            let na = result[0].toNumber();
            let nb = result[1].toNumber();
            let state = result[2];
            console.log('state: ', state);
            console.log('na: ', na, 'nb: ', nb);

            if (state === 1)
                this.addMessage(`请求者na: ${na} ✔, 响应者nb: ${nb} ✔, 取模: ${(na + nb) % 100}`);
            else if (state === 8)
                this.addMessage(`请求者na: ${na} ✔, 响应者nb: ${nb} ✘, 取模: ${na % 100}`);
            else if (state === 9)
                this.addMessage(`请求者na: ${na} ✘, 响应者nb: ${nb} ✔, 取模: ${nb % 100}`);
            else if ([2, 3, 4, 5, 6, 7].includes(state)) this.addMessage(`未上传完毕, 请等待!`);
            else if (state === 10)
                this.addMessage(`请求者na: ${na} ✘, 响应者nb: ${nb} ✘, 双方都上传错误！`);
            else this.addMessage(`请求者na: ${na} ?, 响应者nb: ${nb} ?`);
        } catch (e) {
            this.addMessage(e.reason);
        }
    },
    // 监听ni ri上传事件
    //////////////////////////////////获取签名部分//////////////////////////////////

    //////////////////////////////签名展示////////////////////////////////////////
    async showAll(to) {
        let res = await sigContract.getAllSigs(to);
    },

    //////////////////////////////token chain////////////////////////////////////////
    sendChainData() {
        let chainData = tokenChain.computeInitialData(3);
        this.addMessage(
            `r: ${chainData.r0}, hashForward: ${chainData.hashForward}, hashbackward: ${chainData.hashbackward}, b: ${chainData.b}`
        );
        console.log(tokenChain.validatorAccount);
        this.socket.emit('chain initialization from requester', {
            from: this.myAddress,
            to: tokenChain.validatorAccount,
            chainData,
        });
    },
    //////////////////////////////其他事件////////////////////////////////////////
    // 输入私钥显示账户
    keyConversion(privateKey) {
        sigContract.getWallet(privateKey);
        this.myAddress = sigContract.wallet.address;

        // 显示自己的地址、使用address加入房间
        let addressSpan = document.getElementById('addressSpan');
        addressSpan.innerText = '地址：' + this.myAddress;
        this.joinRoom(this.myAddress);
    },

    // 加入房间
    joinRoom(username) {
        //const username = document.getElementById('username').value;
        if (username) {
            this.socket.emit('join', { username: username });
        }
    },

    // 向表格中增加一行
    addOneLine(table) {
        let row = document.createElement('tr');
        table.appendChild(row);
        // 第一个参数变量代表table
        for (let i = 1; i < arguments.length; i++) {
            let cell = document.createElement('td');
            cell.innerText = arguments[i];
            row.appendChild(cell);
        }
        // 1行中只用了1列, 让这一列占剩下的列
        let nowRowCell = row.cells.length,
            firstRowCell = table.rows[0].cells.length;
        // console.log(nowRowCell, firstRowCell - nowRowCell + 1);
        if (nowRowCell < firstRowCell) {
            // console.log(firstRowCell - nowRowCell + 1);
            row.cells[nowRowCell - 1].colSpan = firstRowCell - nowRowCell + 1;
        }
    },

    // 更新表格的具体某行某列
    updateOneCell(table, rowIndex, colIndex, val) {
        table.rows[rowIndex].cells[colIndex].innerText = val;
    },

    // 添加消息到聊天记录
    addMessage(message) {
        const ul = document.getElementById('messages');
        const li = document.createElement('li');
        li.appendChild(document.createTextNode(message));
        ul.appendChild(li);
    },

    //清空消息
    clearMessage() {
        const ul = document.getElementById('messages');
        ul.innerHTML = '';
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

    // 清除1行
    clearOneLine(myTable, rowIndex) {
        if (myTable.rows.length >= rowIndex + 1) {
            myTable.deleteRow(rowIndex);
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
        sig.keyConversion(private_key);
    });

    // 请求者上传hash, 发送成功后通知对方已上传
    document.querySelector('#reqHashBtn').addEventListener('click', () => {
        let addressA = sigContract.wallet.address;
        let addressB = document.getElementById('receiver').value;
        sig.randomHashReq(addressA, addressB);
    });

    // 显示选择的随机数
    document.querySelector('#showRandomBtn').addEventListener('click', () => {
        let sender = document.getElementById('verify-sender').value;
        let receiver = document.getElementById('verify-receiver').value;
        let index = document.getElementById('verify-index').value;
        sig.showRandom(sender, receiver, index);
    });

    // 通过文件读取私钥
    document.getElementById('privateKeyFile').addEventListener(
        'change',
        function () {
            const file = privateKeyFile.files[0]; // 获取用户选择的文件

            if (file) {
                const reader = new FileReader();
                // 读取完成
                reader.onload = (event) => {
                    const fileContent = event.target.result;
                    // 将内容按行分割成数组(\r: 回到行首; \n: new line)
                    const lines = fileContent.split('\r\n');
                    lines.pop();
                    try {
                        tokenChain.realNameAccount = lines[0];
                        tokenChain.anonymousAccount = lines[1];
                        // console.log(lines);
                        if (lines.length > 2 && lines.length !== 102)
                            throw new Error('上传文件格式错误');
                        else tokenChain.tempAccount = lines.slice(2);
                        this.keyConversion(tokenChain.realNameAccount);
                    } catch (e) {
                        console.log(e);
                    }
                };
                // 读取
                reader.readAsText(file);
            }
        }.bind(sig)
    );

    // 发送链初始化数据
    document.querySelector('#sendChainDataBtn').addEventListener('click', () => {
        sig.sendChainData();
    });
});
