import FairInteger from './fair-integer-sep';
const createKeccakHash = require('keccak');
import { Buffer } from 'buffer';

// token chain用到的函数
const tokenChain = {
    realNameAccount: null,
    anonymousAccount: null,
    tempAccount: null,
    selectedTempAccount: null,
    validatorAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
    r: [],
    b: [],
    hashForward: [],
    hashBackward: [],
    chainLength: 3,
    relayIndex: 0, // 向第几个relay发送数据
    relayReceivedData: {
        dataFromApp: {},
        dataFromPreRelay: {},
    }, // relay收到的数据

    init(socket) {
        this.socket = socket;
        socket.on('applicant to relay', (data) => {
            this.relayReceivedData.dataFromApp = data;
        });
        socket.on('pre relay to next relay', (data) => {
            this.relayReceivedData.dataFromPreRelay = data;
        });
        this.socket.on('chain initialization request', (data) => {
            this.relayReceivedData.dataFromApp = data;
            FairInteger.addMessage(
                `r: ${data.r}, hashForward: ${data.hf}, hashbackward: ${data.hb}, b: ${data.b}`
            );
            let result = tokenChain.validateData(chainData.r0, chainData.hashForward);
            if (result) FairInteger.addMessage('chain initialization data is correct');
            else FairInteger.addMessage('chain initialization data is false');
        });
    },

    // 对任意个数的参数取hash
    keccak256(...args) {
        let hash = createKeccakHash('keccak256');
        for (let arg of args) hash.update(arg.toString());
        return hash.digest('hex');
    },

    // 生成指定长度的随机字节数组
    generateRandomByte(length) {
        let randomArray = new Uint8Array(length);
        if (window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(randomArray);
        } else {
            throw new Error('浏览器不支持crypto.getRandomValues()');
        }
        // 将uint8array转化为16进制字符串
        // let hexString = [...randomArray].map((x) => x.toString(16).padStart(2, '0')).join('');
        let hexString = Buffer.from(randomArray).toString('hex');
        return '0x' + hexString;
    },

    // 链初始化用到的数据
    computeInitialData() {
        for (let i = 0; i <= this.chainLength + 2; i++) {
            // selectedTempAccount: 100个账户中只会用到一部分
            let randomIndex = Math.floor(Math.random() * 100);
            this.selectedTempAccount.push(this.tempAccount[randomIndex]);

            // b: fair-integer选出随机数之后, 加b, mod n
            this.b.push(Math.floor(Math.random() * 100));

            // r: hash时混淆
            this.r.push(this.generateRandomByte(32));
        }
        // selectedTempAccount中第一个账户为real name account
        this.selectedTempAccount.pop();
        this.selectedTempAccount.unshift(this.realNameAccount);

        // 计算hash
        this.hashForward.push(this.keccak256(this.selectedTempAccount[0], this.r[0]));
        for (let i = 1; i <= this.chainLength + 1; i++) {
            this.hashForward.push(
                this.keccak256(this.selectedTempAccount[i], this.r[i], this.hashForward[i - 1])
            );
        }
        this.hashBackward.unshift(
            this.keccak256(
                this.selectedTempAccount[this.chainLength + 2],
                this.r[this.chainLength + 2]
            )
        );
        // 计算反向hash时, 每次都将数据放到数组头部
        for (let i = this.chainLength; i >= 0; i--) {
            this.hashBackward.unshift(
                this.keccak256(this.selectedTempAccount[i + 1], this.r[i + 1], this.hashBackward[0])
            );
        }
        return {
            r0: this.r[0],
            hashForward: this.hashForward[0],
            hashBackward: this.hashBackward[0],
            b: this.b[0],
        };
    },
    // 请求者: 公平随机数生成, 向relay发送数据
    reqUploadHash(addressA, addressB) {
        let listenResResult = FairInteger.randomHashReq(addressA, addressB);
        listenResResult.then((relayAccount) => {
            this.sendApp2RelayData(this.relayIndex, relayAccount);
        }, null);
    },
    reqUploadNum(addressA, addressB) {},

    // 响应者: 公平随机数生成, 向relay发送数据
    resUploadHash(addressA, addressB) {
        let listenReqResult = FairInteger.randomHashRes(addressA, addressB);
        listenReqResult.then((relayAccount) => {
            this.sendToNextRelay(relayAccount);
        }, null);
    },
    resUploadNum() {},
    // applicant向relay发送数据
    sendApp2RelayData(relayIndex, applicantTempAccount, relayAccount) {
        let data = null;
        if (relayIndex === 0)
            data = {
                r: this.r[0],
                hf: this.hashForward[0],
                hb: this.hashBackward[0],
                b: this.b[0],
            };
        else if (relayIndex >= 1 && relayIndex <= this.chainLength - 1)
            data = {
                account: this.selectedTempAccount[relayIndex],
                r: this.r[relayIndex],
                hf: this.hashForward[relayIndex],
                hb: this.hashBackward[relayIndex],
                b: this.b[relayIndex],
                c: 100,
            };
        else if (relayIndex === this.chainLength)
            data = {
                account: this.selectedTempAccount[relayIndex],
                r: this.r[relayIndex],
                hf: this.hashForward[relayIndex],
                hb: this.hashBackward[relayIndex],
                c: 100,
            };
        else if (relayIndex === this.chainLength + 1)
            data = {
                account: this.selectedTempAccount[relayIndex],
                r: this.r[relayIndex],
                hf: this.hashForward[relayIndex],
                hb: this.hashBackward[relayIndex],
            };
        else if (relayIndex === this.chainLength + 2)
            data = {
                account: this.selectedTempAccount[relayIndex],
                r: this.r[relayIndex],
            };
        this.socket.emit('applicant to relay', {
            ...data,
            from: applicantTempAccount,
            to: relayAccount,
        });
    },

    // relay向applicant发送数据
    sendRelay2AppData() {},
    //  前一个relay向后一个relay发送数据
    sendToNextRelay() {
        let data = null;
        data = this.socket.emit('pre relay to next relay', {
            ...data,
            from: applicantTempAccount,
            to: relayAccount,
        });
    },
    // 后一个relay向前一个relay发送响应数据
    SendToPreRelay() {},

    // 验证正向hash
    verifyHashForward(applicantTempAccount, r, currentHash, PreHash) {
        if (PreHash === undefined) return currentHash === this.keccak256(applicantTempAccount, r);
        else return currentHash === this.keccak256(applicantTempAccount, r, PreHash);
    },
    // 验证反向hash
    verifyHashBackward(applicantTempAccount, r, currentHash, nextHash) {
        if (nextHash === undefined) return currentHash === this.keccak256(applicantTempAccount, r);
        else return currentHash === this.keccak256(applicantTempAccount, r, nextHash);
    },
};

export default tokenChain;
