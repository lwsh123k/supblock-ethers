const createKeccakHash = require('keccak');
import { Buffer } from 'buffer';

// token chain用到的函数
const tokenChain = {
    realNameAccount: null,
    anonymousAccount: null,
    tempAccount: null,
    relayAccount: null,
    validatorAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',

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
    computeInitialData(chainLength) {
        let selectedTempAccount = [];
        let b = Math.floor(Math.random() * 100);
        let r = [];
        for (let i = 0; i < chainLength; i++) {
            let randomIndex = Math.floor(Math.random() * 100);
            selectedTempAccount.push(this.tempAccount[randomIndex]);
        }
        this.relayAccount = [
            this.validatorAccount,
            ...selectedTempAccount,
            this.validatorAccount,
            this.validatorAccount,
        ];
        for (let i = 0; i <= chainLength + 2; i++) {
            r.push(this.generateRandomByte(32));
        }
        // 正向hash
        let hashForward = this.keccak256(this.relayAccount[0], r[0]);
        let hashbackward = this.keccak256(this.relayAccount[chainLength + 2], r[chainLength + 2]);
        for (let i = chainLength; i >= 0; i--) {
            hashbackward = this.keccak256(this.relayAccount[i + 1], r[i + 1], hashbackward);
        }
        return { r0: r[0], hashForward, hashbackward, b };
    },

    // 验证数据
    validateData(r0, hashForward) {
        return hashForward === this.keccak256(this.validatorAccount, r0);
    },
};

export default tokenChain;
