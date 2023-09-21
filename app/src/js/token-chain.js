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

    // applicant向relay发送数据
    getApp2RelayData() {
        relayIndex = this.relayIndex;
        if (relayIndex === 0)
            return {
                r: this.r[0],
                hf: this.hashForward[0],
                hb: this.hashBackward[0],
                b: this.b[0],
            };
        else if (relayIndex >= 1 && relayIndex <= this.chainLength - 1)
            return {
                account: this.selectedTempAccount[relayIndex],
                r: this.r[relayIndex],
                hf: this.hashForward[relayIndex],
                hb: this.hashBackward[relayIndex],
                b: this.b[relayIndex],
                c: 100,
            };
        else if (relayIndex === this.chainLength)
            return {
                account: this.selectedTempAccount[relayIndex],
                r: this.r[relayIndex],
                hf: this.hashForward[relayIndex],
                hb: this.hashBackward[relayIndex],
                c: 100,
            };
        else if (relayIndex === this.chainLength + 1)
            return {
                account: this.selectedTempAccount[relayIndex],
                r: this.r[relayIndex],
                hf: this.hashForward[relayIndex],
                hb: this.hashBackward[relayIndex],
            };
        else if (relayIndex === this.chainLength + 2)
            return {
                account: this.selectedTempAccount[relayIndex],
                r: this.r[relayIndex],
            };
    },

    // relay向applicant发送数据
    sendRelay2AppData() {},
    //  前一个relay向后一个relay发送数据
    sendToNextRelay() {},
    // 后一个relay向前一个relay发送响应数据
    SendToPreRelay() {},
    // 验证数据
    validateData(r0, hashForward) {
        return hashForward === this.keccak256(this.validatorAccount, r0);
    },
};

export default tokenChain;
