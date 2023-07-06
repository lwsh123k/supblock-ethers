import { ethers } from 'ethers';

const sigContract = {
    // 创建 Web3Provider 对象
    provider: null,
    wallet: null,
    singerContract: null,
    contract: null,
    contractAddress: '0x0165878a594ca255338adfa4d48449f69242eb8f',

    abi: [
        'event ReqInfoUpload(address indexed from, address indexed to, uint256 ni, uint256 tA, uint256 tB, uint256 ri, bytes32 infoHash)',
        'event ResInfoUpload(address indexed from, address indexed to, uint256 ni, uint256 tA, uint256 tB, uint256 ri, bytes32 infoHash)',
        'function setReqHash(address receiver, bytes32 mHash) public',
        `function setResHash(address sender, bytes32 mHash) public`,
        `function setReqInfo(address receiver, uint256 ni, uint256 ri) public`,
        `function setResInfo(address sender, uint256 ni, uint256 ri) public`,
        'function getReqExecuteTime(address receiver) public view returns (uint256, uint256, uint256)',
        'function getResExecuteTime(address sender) public view returns (uint256, uint256, uint256)',
        `function verifyInfo(address sender, address receiver, uint256 index) public view returns (string memory)`,
        'function reuploadNum(address sender, address receiver, uint256 index, uint8 source, uint ni, uint ri) public',
        'function showNum(address sender, address receiver, uint256 index) public view returns (uint256, uint256, uint8)',
    ],

    // 初始化
    async start() {
        if (window.ethereum) this.provider = new ethers.providers.Web3Provider(window.ethereum);
        // else this.provider = new ethers.providers.JsonRpcProvider('http://localhost:7545');
        else this.provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');

        this.contract = new ethers.Contract(this.contractAddress, this.abi, this.provider);
    },

    // 获取wallet类
    getWallet(private_key) {
        this.wallet = new ethers.Wallet(private_key, this.provider);
        this.singerContract = this.contract.connect(this.wallet);
    },

    // 设置请求者hash
    async setReqHash(receiver, mHash) {
        let gasEstimate = await this.singerContract.estimateGas.setReqHash(receiver, mHash);
        let tx = await this.singerContract.setReqHash(receiver, mHash, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
        });
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
            // let result = await this.singerContract.callStatic.setReqInfo(receiver, ni, ri, {
            //     gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
            // });
            // console.log(result);
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
                console.log('error reason:', error.reason);
                return 'error message:' + error.reason;
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
                console.log('error reason:', error.reason);
                return 'error message:' + error.reason;
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

    // 请求者使用：监听响应者ni ri上传事件(source区分是请求者(=0)还是响应者(=1))
    /* 此处ethers.utils.solidityKeccak256函数使用abi.encodePacked进行编码, 但solidity中使用abi.encode进行编码, 
    但由于数据都是32bit的整数倍且数据类型为静态的uint类型, 所以abi.encode不会发生填充, 因此二者结果相同 */
    async listenResNum(reqAddress, resAddress, reuploadIndex) {
        // 只有provider才有过滤器属性
        let resFilter = this.contract.filters.ResInfoUpload(reqAddress, resAddress);
        let listenResult = false; // 是否监听到, 没有监听到, 说明对方没有上传ni ri
        let isReupload = false; // 是否重新上传了ni ri
        let newni = Math.floor(Math.random() * 100); // 重新生成ni ri
        let newri = this.generateRandomBytes(32);
        // console.log('过滤器详情：');
        // console.log(resFilter);
        this.contract
            .once(resFilter, async (from, to, ni, tA, tB, ri, infoHash) => {
                listenResult = true;
                let hash = ethers.utils.solidityKeccak256(
                    ['uint256', 'uint256', 'uint256', 'uint256'],
                    [ni, tA, tB, ri]
                );
                console.log('hash:', hash, typeof hash);
                console.log('infoHash:', infoHash, typeof infoHash);
                if (hash != infoHash) {
                    console.log(reuploadIndex);
                    await this.singerContract.reuploadNum(from, to, reuploadIndex, 0, newni, newri);
                    isReupload = true;
                }
            })
            .once('error', (error) => {
                console.log(error);
            });

        // 因为上链也需要时间, 如果上链代码一执行就计时, 会导致计时开始的时间和block.timestamp不一致. 所以在150s的基础上增加20s给上链
        const timeout = 170000;
        let timeoutId = setTimeout(async () => {
            this.contract.removeAllListeners(resFilter); // 如果超时，则移除事件监听器
            if (listenResult === false) {
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
        }, timeout);
    },

    // 响应者使用：监听请求者ni ri上传事件(source区分是请求者(=0)还是响应者(=1))
    async listenReqNum(reqAddress, resAddress, reuploadIndex) {
        let reqFilter = this.contract.filters.ReqInfoUpload(reqAddress, resAddress);
        let listenResult = false;
        let isReupload = false;
        let newni = Math.floor(Math.random() * 100);
        let newri = this.generateRandomBytes(32);
        this.contract
            .once(reqFilter, async (from, to, ni, tA, tB, ri, infoHash) => {
                listenResult = true;
                let hash = ethers.utils.solidityKeccak256(
                    ['uint256', 'uint256', 'uint256', 'uint256'],
                    [ni, tA, tB, ri]
                );
                console.log('hash:', hash);
                console.log('infoHash:', infoHash);
                if (hash != infoHash) {
                    await this.singerContract.reuploadNum(from, to, reuploadIndex, 1, newni, newri);
                    isReupload = true;
                }
            })
            .once('error', (error) => {
                console.log(error);
            });

        const timeout = 140000;
        let timeoutId = setTimeout(async () => {
            this.contract.removeAllListeners(reqFilter);
            if (listenResult === false) {
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
        }, timeout);
    },

    // 请求者使用：监听响应者hash上传事件(source区分是请求者(=0)还是响应者(=1))
    async listenResHash(reqAddress, resAddress, ni, ri) {
        let filter = this.contract.filters.ResHashUpload(reqAddress, resAddress);
        this.contract
            .once(filter, async (from, to, infoHashB) => {
                await this.singerContract.setReqInfo(from, to, ni, ri);
            })
            .once('error', (error) => {
                console.log(error);
            });

        const timeout = 30000;
        let timeoutId = setTimeout(() => {
            this.contract.removeAllListeners(filter);
        }, timeout);
    },
};

export default sigContract;
