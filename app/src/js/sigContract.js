import { ethers } from 'ethers';

// 定义结构体abi
const InfoAbi =
        '(bytes32 c, bytes32 deblindHash, bytes32 mHash, uint reqTimestamp, bytes32 s, \
bytes32 t, uint resTimestamp)',
    VerifyInfoAbi =
        '(address sender, address receiver, string message, uint c, uint deblind, \
    uint s, uint t, uint px, uint py)';

const sigContract = {
    // 创建 Web3Provider 对象
    provider: null,
    wallet: null,
    singerContract: null,
    contract: null,
    contractAddress: '0x493C19EcBe74962d68Fb5134c6d8bd6027F4328A',

    abi: [
        'function setRequestSig(address receiver, bytes32 c, bytes32 deblindHash, bytes32 mHash) public',
        'function setResponseSig(address sender, bytes32 s, bytes32 t, bytes32 pkx, bytes32 pky) public',
        `function getSig(address receiver, uint index) public view returns (${InfoAbi} memory)`,
        `function getAllSigs(address receiver) public view returns (${InfoAbi}[] memory)`,
        `function verifySig(${VerifyInfoAbi} memory info) public view returns (bool)`,
    ],

    // 初始化
    async start() {
        if (window.ethereum) this.provider = new ethers.providers.Web3Provider(window.ethereum);
        else this.provider = new ethers.providers.JsonRpcProvider('http://localhost:7545');

        this.contract = new ethers.Contract(this.contractAddress, this.abi, this.provider);
    },

    // 获取wallet类
    getWallet(private_key) {
        this.wallet = new ethers.Wallet(private_key, this.provider);
        this.singerContract = this.contract.connect(this.wallet);
    },

    // 设置请求部分的签名
    async setRequestSig(receiver, c, deblindHash, mHash) {
        let tx = await this.singerContract.setRequestSig(receiver, c, deblindHash, mHash);
        await tx.wait();
    },

    // 设置响应部分的签名
    async setResponseSig(sender, s, t, pkx, pky) {
        let tx = await this.singerContract.setResponseSig(sender, s, t, pkx, pky);
        await tx.wait();
    },

    // 根据id获得签名
    async getSig(receiver, index) {
        let result = await this.singerContract.getSig(receiver, index);
        console.log(result);
        return result;
    },

    // 获得所有签名
    async getAllSigs(receiver) {
        let result = await this.singerContract.getAllSigs(receiver);
        console.log(result);
        return result;
    },

    // 验证签名
    async verifySig(info) {
        let result = await this.singerContract.verifySig(info);
        console.log(result);
        return result;
    },
};

export default sigContract;
