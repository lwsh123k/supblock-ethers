import { ethers } from 'ethers';
import contractAddress from './contract-address.json';

const sigContract = {
    // 创建 Web3Provider 对象
    provider: null,
    wallet: null,
    singerContract: null,
    contract: null,
    contractAddress: contractAddress.FairIntegerContract,
    reqTimeOutId: [], // 存储定时器id, 方便清除定时
    resTimeOutId: [],

    abi: [
        'event ResHashUpload(address indexed from, address indexed to, bytes32 infoHashB)',
        'event ReqInfoUpload(address indexed from, address indexed to, uint8 state)',
        'event ResInfoUpload(address indexed from, address indexed to, uint8 state)',
        'function setReqHash(address receiver, bytes32 mHash) public',
        `function setResHash(address sender, bytes32 mHash) public`,
        `function setReqInfo(address receiver, uint256 ni, uint256 ri) public`,
        `function setResInfo(address sender, uint256 ni, uint256 ri) public`,
        'function getReqExecuteTime(address receiver) public view returns (uint256, uint256, uint256)',
        'function getResExecuteTime(address sender) public view returns (uint256, uint256, uint256)',
        `function verifyInfo(address sender, address receiver, uint256 index) public view returns (string memory)`,
        'function reuploadNum(address sender, address receiver, uint256 index, uint8 source, uint ni, uint ri) public',
        'function showNum(address sender, address receiver, uint256 index) public view returns (uint256, uint256, uint8)',
        'function getState(address sender, address receiver, uint256 index) public view returns (uint8)',
    ],

    // 初始化
    async start(provider) {
        this.provider = provider;
        this.contract = new ethers.Contract(this.contractAddress, this.abi, this.provider);
    },

    // 设置wallet类
    setWallet(private_key) {
        this.wallet = new ethers.Wallet(private_key, this.provider);
        this.singerContract = this.contract.connect(this.wallet);
    },

    // 设置请求者hash
    async setReqHash(receiver, mHash) {
        let gasEstimate = await this.singerContract.estimateGas.setReqHash(receiver, mHash);
        let tx = await this.singerContract.setReqHash(receiver, mHash, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
        });
        //transaction.wait( [ confirms = 1 ] ) ⇒ Promise< TransactionReceipt >
        // confirms属性表示你愿意等待的挖出区块数量, 一旦满足这个值将返回一个待解析的TransactionReceipt. 如果confirms为0，并且交易还没有被挖出，则返回null。
        await tx.wait();
    },

    // 设置响应者hash
    async setResHash(sender, mHash) {
        let gasEstimate = await this.singerContract.estimateGas.setResHash(sender, mHash);
        let tx = await this.singerContract.setResHash(sender, mHash, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
        });
        await tx.wait();
    },

    // 设置请求者ni, ri
    async setReqInfo(receiver, ni, ri) {
        // 模拟执行, 查看是否满足ni ri上传的条件
        try {
            // 静态模拟调用获取返回值
            let gasEstimate = await this.singerContract.estimateGas.setReqInfo(receiver, ni, ri);
            // static call time: 19.045166015625 ms
            // console.time('static call time');
            // let result = await this.singerContract.callStatic.setReqInfo(receiver, ni, ri, {
            //     gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
            // });
            // console.timeEnd('static call time');

            // 只有模拟的合约正常执行, 才会进行真正的执行交易
            let tx = await this.singerContract.setReqInfo(receiver, ni, ri, {
                gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
            });
            let receipt = await tx.wait();
            if (receipt && receipt.status == 1) {
                return true;
            } else return false;
        } catch (error) {
            if (error.reason) {
                //console.log('error reason:', error.reason);
                //return 'error message:' + error.reason;
            } else {
                console.log('error:', error);
            }
        }
    },

    // 设置响应者者ni, ri
    async setResInfo(sender, ni, ri) {
        // 模拟执行, 查看是否满足ni ri上传的条件
        try {
            // 静态模拟调用获取返回值
            let gasEstimate = await this.singerContract.estimateGas.setResInfo(sender, ni, ri);
            // let result = await this.singerContract.callStatic.setResInfo(sender, ni, ri, {
            //     gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
            // });
            // console.log(result); // result是一个空数组
            // 只有模拟的合约正常执行, 才会进行真正的执行交易
            let tx = await this.singerContract.setResInfo(sender, ni, ri, {
                gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
            });
            let receipt = await tx.wait();
            if (receipt && receipt.status == 1) {
                return true;
            } else return false;
        } catch (error) {
            if (error.reason) {
                //console.log('error reason:', error.reason);
                //return 'error message:' + error.reason;
            } else {
                console.log('error:', error);
            }
        }
    },

    // 请求者调用: 获得执行次数
    async getReqExecuteTime(receiver) {
        let result = await this.singerContract.getReqExecuteTime(receiver);
        // console.log(result);
        return result;
    },

    // 获得响应者执行次数
    async getResExecuteTime(sender) {
        let result = await this.singerContract.getResExecuteTime(sender);
        // console.log(result);
        return result;
    },

    // 验证上传信息的正确性
    async verifyInfo(sender, receiver, index) {
        let result = await this.singerContract.verifyInfo(sender, receiver, index);
        // console.log(result);
        return result;
    },

    // 返回双方选择的随机数
    async showNum(sender, receiver, index) {
        let result = await this.singerContract.showNum(sender, receiver, index);
        return result;
    },

    // 返回双方选择的随机数
    async getState(sender, receiver, index) {
        let result = await this.singerContract.getState(sender, receiver, index);
        return result;
    },

    // 生成指定长度的不全为0随机字节数组, 并转换为16进制返回
    generateRandomBytes(length) {
        let randomBytes;
        do {
            // 返回值类型为 Uint8Array
            randomBytes = ethers.utils.randomBytes(length);
        } while (!randomBytes.some((x) => x !== 0)); // 数组存在x不为0,即可退出while循环
        // 将字节数组转换为十六进制字符串
        return ethers.utils.hexlify(randomBytes);
    },

    // 计算hash, 使用keccak256, 保证数据类型与solidity中的数据类型一致
    getHash(ni, ta, tb, ri) {
        const hash = ethers.utils.solidityKeccak256(
            ['uint256', 'uint256', 'uint256', 'uint256'],
            [ni, ta, tb, ri]
        );
        return hash;
    },

    // 计算签名
    async getSign(data, privateKey) {
        let wallet = new ethers.Wallet(privateKey, this.provider);
        let signedData = await wallet.signMessage(data);
        return signedData;
    },

    // 计算地址
    getAddress(privateKey) {
        let address = ethers.utils.computeAddress(privateKey);
        return address;
    },

    // 请求者使用：监听响应者ni ri上传事件(source区分是请求者(=0)还是响应者(=1))
    /* 此处ethers.utils.solidityKeccak256函数使用abi.encodePacked进行编码, 但solidity中使用abi.encode进行编码, 
    但由于数据都是32bit的整数倍且数据类型为静态的uint类型, 所以abi.encode不会发生填充, 因此二者结果相同 */
    async listenResNum(reqAddress, resAddress, reuploadIndex, newni, newri) {
        return new Promise((resolve, reject) => {
            // 只有provider才有过滤器属性
            let resFilter = this.contract.filters.ResInfoUpload(reqAddress, resAddress);
            let listenResult = false; // 是否监听到, 没有监听到, 说明对方没有上传ni ri
            let isReupload = false; // 是否重新上传了ni ri

            // 增加10s原因: 上链代码执行完成时, 需要进行交易确认, 然后才可以通过事件监听查询到
            // 先设置定时. 如果监听到了, 就取消定时;
            //            如果没有监听到, 就让定时器取消监听;
            const timeout = 100000; // 30s + 60s +10s
            let timeoutId = setTimeout(async () => {
                this.reqTimeOutId.shift();
                if (listenResult === false) {
                    this.contract.removeAllListeners(); // 如果没有监听到(超时), 则移除事件监听器
                    let state = await this.getState(reqAddress, resAddress, reuploadIndex);
                    if (state === 4) {
                        await this.singerContract.reuploadNum(
                            reqAddress,
                            resAddress,
                            reuploadIndex,
                            0,
                            newni,
                            newri
                        );
                        isReupload = true;
                    }
                    resolve([isReupload, listenResult, state]);
                }
            }, timeout);
            this.reqTimeOutId.push(timeoutId);

            // 监听部分
            this.contract
                .once(resFilter, async (from, to, state) => {
                    listenResult = true;
                    clearTimeout(this.reqTimeOutId.shift());
                    if (state == 2 || state == 7) {
                        await this.singerContract.reuploadNum(
                            from,
                            to,
                            reuploadIndex,
                            0,
                            newni,
                            newri
                        );
                        isReupload = true;
                    }
                    resolve([isReupload, listenResult, state]);
                })
                .once('error', (error) => {
                    console.log(error);
                    reject(error);
                });
        });
    },

    // 响应者使用：监听请求者ni ri上传事件(source区分是请求者(=0)还是响应者(=1))
    async listenReqNum(reqAddress, resAddress, reuploadIndex, newni, newri) {
        this.clearAllListen();
        return new Promise((resolve, reject) => {
            let reqFilter = this.contract.filters.ReqInfoUpload(reqAddress, resAddress);
            let listenResult = false;
            let isReupload = false;
            // 设置监听的时间: 120s + 10s  或者 60s+10s
            const timeout = 70000;
            let timeoutId = setTimeout(async () => {
                this.resTimeOutId.shift();
                if (listenResult === false) {
                    this.contract.removeAllListeners();
                    let state = await this.getState(reqAddress, resAddress, reuploadIndex);
                    if (state === 5) {
                        await this.singerContract.reuploadNum(
                            reqAddress,
                            resAddress,
                            reuploadIndex,
                            1,
                            newni,
                            newri
                        );
                        isReupload = true;
                    }
                    resolve([isReupload, listenResult, state]);
                }
            }, timeout);
            this.resTimeOutId.push(timeoutId);
            // 监听部分
            this.contract
                .once(reqFilter, async (from, to, state) => {
                    listenResult = true;
                    clearTimeout(this.resTimeOutId.shift());
                    console.log('响应者监听到了, state: ', state);
                    if (state == 3 || state == 6) {
                        await this.singerContract.reuploadNum(
                            from,
                            to,
                            reuploadIndex,
                            1,
                            newni,
                            newri
                        );
                        isReupload = true;
                    }
                    resolve([isReupload, listenResult, state]);
                })
                .once('error', (error) => {
                    console.log(error);
                    reject(error);
                });
        });
    },

    // 请求者使用：监听响应者hash上传事件(source区分是请求者(=0)还是响应者(=1))
    async listenResHash(addressA, addressB) {
        // 每次调用之前清空所有的监听和定时器
        this.clearAllListen();
        return new Promise((resolve, reject) => {
            let filter = this.contract.filters.ResHashUpload(addressA, addressB);
            let listenResult = false;
            // 超时取消监听: 30s + 10s
            const timeout = 40000;
            let timeoutId = setTimeout(() => {
                if (listenResult === false) {
                    // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听, 移除ni ri超时监听
                    this.contract.removeAllListeners();
                    clearTimeout(this.reqTimeOutId.shift());
                    resolve([listenResult]);
                }
            }, timeout);

            // 监听部分
            this.contract
                .once(filter, async (addressA, addressB, infoHashB) => {
                    listenResult = true;
                    resolve([listenResult]);
                })
                .once('error', (error) => {
                    console.log(error);
                    reject(error);
                });
        });
    },

    // 监听重新上传事件（放弃，最终选择使用socket实现）////////////////////////未实现///////////////////
    async listenReupload(reqAddress, resAddress, ni, ri) {
        return new Promise((resolve, reject) => {
            let filter = this.contract.filters.ResHashUpload(reqAddress, resAddress);
            let listenResult = false;
            let isReupload = false;
            this.contract
                .once(filter, async (from, to, infoHashB) => {
                    listenResult = true;
                    // await this.singerContract.setReqInfo(from, to, ni, ri);
                    isReupload = true;
                    resolve([isReupload, listenResult]);
                })
                .once('error', (error) => {
                    console.log(error);
                    reject(error);
                });

            const timeout = 40000; // 30s等待 + 10s确认
            let timeoutId = setTimeout(() => {
                this.contract.removeAllListeners();
                if (listenResult === false) {
                    this.contract.removeAllListeners('ResInfoUpload'); // 如果30s + 10s没有监听到对方上传hash, 需要移除对ni ri的监听
                    // 移除ni ri超时监听
                    // console.log(this.reqTimeOutId.length);
                    clearTimeout(this.reqTimeOutId.shift());
                    resolve([isReupload, listenResult]);
                }
            }, timeout);
        });
    },

    // 当开始新一轮的fair integer generation时, 清空所有监听
    clearAllListen() {
        this.contract.removeAllListeners();
        this.reqTimeOutId.forEach((timeid) => {
            clearTimeout(timeid);
        });
        this.resTimeOutId.forEach((timeid) => {
            clearTimeout(timeid);
        });
        this.reqTimeOutId = [];
        this.resTimeOutId = [];
    },
};

export default sigContract;
