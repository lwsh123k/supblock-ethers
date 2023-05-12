const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const hre = require('hardhat');

describe('SigInfo', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function SigInfo() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await hre.ethers.getSigners();

        const SigInfo = await hre.ethers.getContractFactory('SigInfo');
        const sigInfo = await SigInfo.deploy();

        return { sigInfo, owner, otherAccount };
    }

    describe('set sig info', function () {
        it('Check set sig info', async function () {
            const { sigInfo, owner, otherAccount } = await loadFixture(SigInfo);
            // 设置px py对应的账户
            const privateKey = '0x1184cd2cdd640ca42cfc3a091c51d549b2f016d454b2774019c2b2d2e08529fd';
            const wallet = new hre.ethers.Wallet(privateKey, owner.provider);

            // 设置cHash和mHash
            let c = '0xef0fb544cb8f4a4bac9dc10814e843be02ad34856b0b6649fdbf2f1606a0a02a';
            let deblind = '0x03bff9bdeb8cc0c90ffdb7d93a64b804b72570a3710649a77286e1226d66df93';
            let deblindHash = '0x81b4ea1c1f919167e33215badf72400e8959c8d2001256151ec006381a45c4f0';
            let mHash = '0x76cef4a5570d9a55a89ec45b1b78cf425595f6e684976cfaa27bc25227567fe6';
            const txReq = await sigInfo.setRequestSig(wallet.address, c, deblindHash, mHash);
            await txReq.wait();

            const result1 = await sigInfo.getAllSigs(wallet.address);
            console.log(result1);

            // 设置s和t
            let s = '0xf2e9001aab312f338696eaac7256993423f1711bb4809003d67090d62a56d382';
            let t = '0x0000000000000000000000000000000000000000000000000000000000000000';
            let px = '0xd0988bfa799f7d7ef9ab3de97ef481cd0f75d2367ad456607647edde665d6f6f';
            let py = '0xbdd594388756a7beaf73b4822bc22d36e9bda7db82df2b8b623673eefc0b7495';
            //const ResSigInfo = sigInfo.connect(otherAccount); // 模拟切换成其他用户响应签名
            const ResSigInfo = sigInfo.connect(wallet);
            // 此时这个账户余额为0，向其转账
            owner.sendTransaction({
                to: wallet.address,
                value: hre.ethers.utils.parseEther('100'),
            });
            const txRes = await ResSigInfo.setResponseSig(owner.address, s, t, px, py);
            await txRes.wait();

            const result2 = await sigInfo.getAllSigs(wallet.address);
            console.log(result2);
            //expect(await sigInfo.getAllSigs()).to.equal(totalSupply);
        });
    });
});
