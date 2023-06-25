import { ethers } from 'ethers';

const sigContract = {
    // 创建 Web3Provider 对象
    provider: null,
    wallet: null,
    singerContract: null,
    contract: null,
    contractAddress: '0xe78a0f7e598cc8b0bb87894b0f60dd2a88d6a8ab',

    abi: [
        'function setReqHash(address receiver, bytes32 mHash) public',
        `function setResHash(address sender, bytes32 mHash) public`,
        `function setReqInfo(address receiver, uint256 ni, uint256 ri) public`,
        `function setResInfo(address sender, uint256 ni, uint256 ri) public`,
        'function getReqExecuteTime(address receiver) public view returns (uint256, uint256)',
        'function getResExecuteTime(address sender) public view returns (uint256, uint256)',
        `function verifyInfo(address sender, address receiver, uint256 index) public view returns (string memory)`,
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
        let gasEstimate = await this.singerContract.estimateGas.setReqInfo(receiver, ni, ri);
        let tx = await this.singerContract.setReqInfo(receiver, ni, ri, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
        });
        await tx.wait();
    },

    // 设置响应者者ni, ri
    async setResInfo(sender, ni, ri) {
        let gasEstimate = await this.singerContract.estimateGas.setResInfo(sender, ni, ri);
        let tx = await this.singerContract.setResInfo(sender, ni, ri, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
        });
        await tx.wait();
    },

    // 请求者调用: 获得执行次数
    async getReqExecuteTime(receiver) {
        let result = await this.singerContract.getReqExecuteTime(receiver);
        console.log(result);
        return result;
    },

    // 获得响应者执行次数
    async getResExecuteTime(sender) {
        let result = await this.singerContract.getResExecuteTime(sender);
        console.log(result);
        return result;
    },

    // 验证上传信息的正确性
    async verifyInfo(sender, receiver, index) {
        let result = await this.singerContract.verifyInfo(sender, receiver, index);
        console.log(result);
        return result;
    },

    // 生成指定长度的随机字节数组, 并转换为16进制返回
    generateRandomBytes(length) {
        const randomBytes = ethers.utils.randomBytes(length);
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
};

export default sigContract;
