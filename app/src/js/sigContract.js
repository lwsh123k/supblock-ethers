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
    contractAddress: '0x753f9df0bc5cf683be4274911c06106c2fa8e945',

    abi: [
        'function setResponseSig(address sender, bytes32 s, bytes32 t, bytes32 pkx, bytes32 pky) public',
        `function getSig(address receiver, uint index) public view returns (${InfoAbi} memory)`,
        `function getAllSigs(address receiver) public view returns (${InfoAbi}[] memory)`,
        `function verifySig(${VerifyInfoAbi} memory info) public view returns (string memory)`,
        'function setSigAndLock(address receiver, bytes32 c, bytes32 deblindHash, bytes32 mHash) public',
        `function vrifySigAndUnLock(${VerifyInfoAbi} memory info) public returns (string memory)`,
        'function totalSupply() external view returns (uint256)',
        'function balanceOf(address account) external view returns (uint256)',
        'function transfer(address to, uint256 amount) external returns (bool)',
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

    // 设置响应部分的签名
    async setResponseSig(sender, s, t, pkx, pky) {
        let gasEstimate = await this.singerContract.estimateGas.setResponseSig(
            sender,
            s,
            t,
            pkx,
            pky
        );
        let tx = await this.singerContract.setResponseSig(sender, s, t, pkx, pky, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
        });
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
        console.log(typeof result);
        console.log(result);
        return result;
    },

    // 验证签名
    async verifySig(info) {
        let result = await this.singerContract.verifySig(info);
        console.log(result);
        return result;
    },

    // 设置请求部分的签名, 并将10ether暂存到合约
    async setSigAndLock(receiver, c, deblindHash, mHash) {
        let gasEstimate = await this.singerContract.estimateGas.setSigAndLock(
            receiver,
            c,
            deblindHash,
            mHash
        );
        let tx = await this.singerContract.setSigAndLock(receiver, c, deblindHash, mHash, {
            gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
        });
        await tx.wait();
    },

    // 验证签名并解锁
    async vrifySigAndUnLock(info) {
        try {
            // 静态模拟调用获取返回值
            let result = await this.singerContract.callStatic.vrifySigAndUnLock(info);
            console.log(result);
            // 只有模拟的合约正常执行, 才会进行真正的执行交易
            if (
                result == 'true signature and transfer to signer' ||
                result == 'false signature and transfer back to requester'
            ) {
                let gasEstimate = await this.singerContract.estimateGas.vrifySigAndUnLock(info);
                let tx = await this.singerContract.vrifySigAndUnLock(info, {
                    gasLimit: (gasEstimate.toNumber() * 1.1).toFixed(0),
                });
                let receipt = await tx.wait();
                if (receipt && receipt.status == 1) {
                    return 'execute success: ' + result;
                } else return 'execute failed';
            } else return result;
        } catch (error) {
            if (error.reason) {
                console.log('Require error:', error);
                console.log('Require error message:', error.reason);
                return 'Require error message:' + error.reason;
            } else {
                console.log('Require error:', error);
            }
        }
    },

    // 转账函数
    async transfer(to, amount) {
        const tx = await this.singerContract.transfer(
            to,
            ethers.utils.parseUnits(amount.toString())
        );
        await tx.wait();
    },

    // 返回账户余额
    async updateBalance(address) {
        const balance = await this.contract.balanceOf(address);
        // 单位格式化，balance / 10^18
        let formatBal = ethers.utils.formatUnits(balance, 18);
        return formatBal;
    },
};

export default sigContract;
