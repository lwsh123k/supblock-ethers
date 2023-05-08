const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const hre = require('hardhat');

describe('LockERC20', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function SigInfo() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const SigInfo = await hre.ethers.getContractFactory('SigInfo');
        const sigInfo = await SigInfo.deploy();

        return { sigInfo, owner, otherAccount };
    }

    describe('Deployment', function () {
        it('Check set sig info', async function () {
            const { sigInfo, owner, otherAccount } = await loadFixture(SigInfo);
            // 设置cHash和mHash
            let cHash = '0x6bcb7d00d5712d9ac1eaea216cfe5f8d643c1bdbbf8565039298bea96b47eb9d';
            let mHash = '0x76cef4a5570d9a55a89ec45b1b78cf425595f6e684976cfaa27bc25227567fe6';
            const txReq = await sigInfo.setRequestSig(otherAccount.address, cHash, mHash);
            await txReq.wait();

            const result1 = await sigInfo.getAllSigs(otherAccount.address);
            console.log(result1);

            // 设置s和t
            let s = '0x9311466051b4195546194db93dbc6f7ffb86694bfb4f41cceeddde6018b5b8ce';
            let t = '0x0000000000000000000000000000000000000000000000000000000000000000';
            const ResSigInfo = sigInfo.connect(otherAccount); // 模拟切换成其他用户响应签名
            const txRes = await ResSigInfo.setResponseSig(owner.address, s, t);
            await txRes.wait();

            const result2 = await sigInfo.getAllSigs(otherAccount.address);
            console.log(result2);
            //expect(await sigInfo.getAllSigs()).to.equal(totalSupply);
        });
    });
});
