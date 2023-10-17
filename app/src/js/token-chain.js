import FairInteger from './fair-integer-sep';
const createKeccakHash = require('keccak');
import { Buffer } from 'buffer';
import PublicKeyEncrypt from './encrypt';
import networkRequest from './network-request';
import storeMsg from './contract-data-process/store-msg';

// token chain用到的函数
const tokenChain = {
    accounts: [], // real-name and anonymous account(sava key and address)
    tempAccount: [], // all temp accounts -> selected temp accounts
    selectedTempAccount: [],
    validatorAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
    r: [],
    b: [],
    hashForward: [],
    hashBackward: [],
    chainLength: 3,
    relayIndex: 0, // 向第几个relay发送数据
    relayReceivedData: {
        readyToVerify: { appData: false, preRelayData: false },
        dataFromApp: {},
        dataFromPreRelay: {},
    }, // relay收到的数据

    init(socket, provider) {
        this.socket = socket;
        // 将FairInteger和storeMsg添加到本对象上是为了导出时, 其中的变量还可以访问
        // 在具体使用时, FairInteger和storeMsg都是引用, this
        this.FairInteger = FairInteger;
        this.storeMsg = storeMsg;
        FairInteger.start(socket, provider);
        storeMsg.start(socket, provider);
        socket.on('applicant to relay', (data) => {
            console.log(data);
            this.relayReceivedData.dataFromApp = data;
            this.relayReceivedData.readyToVerify.appData = true;
        });
        socket.on('pre relay to next relay', (data) => {
            console.log(data);
            this.relayReceivedData.dataFromPreRelay = data;
            this.relayReceivedData.readyToVerify.preRelayData = true;
        });
        socket.on('chain initialization request', (data) => {
            this.relayReceivedData.dataFromApp = data;
            FairInteger.addMessage(
                `r: ${data.r}, hashForward: ${data.hf}, hashbackward: ${data.hb}, b: ${data.b}`
            );
            console.log(data);
            let result = tokenChain.verifyHashForward(data.from, data.r, data.hf);
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
        this.selectedTempAccount.unshift(this.accounts[0]);

        // 计算hash
        this.hashForward.push(this.keccak256(this.selectedTempAccount[0].address, this.r[0]));
        for (let i = 1; i <= this.chainLength + 1; i++) {
            this.hashForward.push(
                this.keccak256(
                    this.selectedTempAccount[i].address,
                    this.r[i],
                    this.hashForward[i - 1]
                )
            );
        }
        this.hashBackward.unshift(
            this.keccak256(
                this.selectedTempAccount[this.chainLength + 2].address,
                this.r[this.chainLength + 2]
            )
        );
        // 计算反向hash时, 每次都将数据放到数组头部
        for (let i = this.chainLength; i >= 0; i--) {
            this.hashBackward.unshift(
                this.keccak256(
                    this.selectedTempAccount[i + 1].address,
                    this.r[i + 1],
                    this.hashBackward[0]
                )
            );
        }
    },

    // 请求者: 公平随机数生成, 向relay发送数据
    // 使用匿名地址连接钱包, 如果是applicant, 每次进行fair integer generation时需要更换为selected temp account
    async reqUploadHash(addressB) {
        this.setWallet(this.selectedTempAccount[this.relayIndex].key);
        let fairIntegerNumber = await FairInteger.randomHashReq(
            this.selectedTempAccount[this.relayIndex].address,
            addressB
        );
        // 选完随机数后, relay index++, 表示当前relay已经结束
        this.relayIndex++;
        let data = this.getApp2RelayData(this.relayIndex);
        let accountInfo = await networkRequest.getAccountInfo(fairIntegerNumber);
        console.log(accountInfo);
        let encryptedData = await PublicKeyEncrypt.getEncryptData(accountInfo.publicKey, data);
        let receiverAddress = accountInfo.address;
        await storeMsg.setApp2RelayData(receiverAddress, encryptedData);
    },

    // 响应者: 公平随机数生成, 向relay发送数据
    resUploadHash(addressA) {
        this.setWallet(this.accounts[1].key);
        let listenReqResult = FairInteger.randomHashRes(addressA, this.accounts[1].address);
        listenReqResult.then(async (fairIntegerNumber) => {
            let data = this.getPre2NextData();
            let accountInfo = await networkRequest.getAccountInfo(fairIntegerNumber);
            let encryptedData = await PublicKeyEncrypt.getEncryptData(accountInfo.publicKey, data);
            let receiverAddress = accountInfo.address;
            await storeMsg.setData2NextRelay(receiverAddress, encryptedData);
        }, null);
    },

    // 请求者上传ni ri
    reqUploadNum(addressB, ni, ri) {
        FairInteger.reqUploadNum(addressB, ni, ri);
    },

    // 响应者上传ni ri
    resUploadNum(addressA, ni, ri) {
        FairInteger.resUploadNum(addressA, ni, ri);
    },

    // relay listening data from applicant
    async listenAppData() {
        // 发送方(applicant and pre relay)使用anonymous account, 接收方使用real name account接收(此时发送方并不知道接收方的anonymous account)
        storeMsg.listenAppData(this.accounts[0].key, this.accounts[0].address);
    },

    // relay listening data from pre relay
    async listenPreRelayData() {
        storeMsg.listenPreRelayData(this.accounts[0].key, this.accounts[0].address);
    },

    // applicant向relay发送数据
    getApp2RelayData(relayIndex) {
        let data = {
            from: null,
            r: null,
            hf: null,
            hb: null,
            b: null,
            c: null,
        };
        if (relayIndex === 0) {
            data.r = this.r[0];
            data.hf = this.hashForward[0];
            data.hb = this.hashBackward[0];
            data.b = this.b[0];
        } else if (relayIndex >= 1 && relayIndex <= this.chainLength - 1) {
            data.from = this.selectedTempAccount[relayIndex];
            data.r = this.r[relayIndex];
            data.hf = this.hashForward[relayIndex];
            data.hb = this.hashBackward[relayIndex];
            data.b = this.b[relayIndex];
            data.c = 100;
        } else if (relayIndex === this.chainLength) {
            (data.from = this.selectedTempAccount[relayIndex]), (data.r = this.r[relayIndex]);
            data.hf = this.hashForward[relayIndex];
            data.hb = this.hashBackward[relayIndex];
            data.c = 100;
        } else if (relayIndex === this.chainLength + 1) {
            data.from = this.selectedTempAccount[relayIndex];
            data.r = this.r[relayIndex];
            data.hf = this.hashForward[relayIndex];
            data.hb = this.hashBackward[relayIndex];
        } else if (relayIndex === this.chainLength + 2) {
            data.from = this.selectedTempAccount[relayIndex];
            data.r = this.r[relayIndex];
        }
        return data;
    },

    // relay向applicant发送数据
    sendRelay2AppData() {},
    //  前一个relay向后一个relay发送数据
    getPre2NextData(preRelayAccount, relayAccount) {
        let data = this.relayReceivedData.dataFromApp;
        return data;
    },
    // 后一个relay向前一个relay发送响应数据
    SendToPreRelay() {},

    // send chain initial data
    sendInitialData() {
        let data = this.getApp2RelayData(0);
        data.from = this.selectedTempAccount[0].address;
        data.to = this.validatorAccount;
        this.socket.emit('chain initialization request', data);
    },

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

    // 重写fair-integer中的方法, 使其可以更换账号, 发送不同的交易
    // 重新设置连接eth的私钥
    setWallet(private_key) {
        FairInteger.setWallet(private_key);
        storeMsg.setWallet(private_key);
    },
};

export default tokenChain;
