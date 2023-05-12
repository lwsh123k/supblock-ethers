const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const hre = require('hardhat');

describe('VerifySig', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function VerifySig() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await hre.ethers.getSigners();

        const VerifySig = await hre.ethers.getContractFactory('VerifySig');
        const verifySig = await VerifySig.deploy();

        return { verifySig, owner, otherAccount };
    }

    describe('verify sig info', function () {
        it('verify sig info', async function () {
            const { verifySig, owner, otherAccount } = await loadFixture(VerifySig);
            // 设置px py对应的账户
            const privateKey = '0x1184cd2cdd640ca42cfc3a091c51d549b2f016d454b2774019c2b2d2e08529fd';
            const wallet = new hre.ethers.Wallet(privateKey, owner.provider);

            // 设置cHash和mHash
            let c = '0xef0fb544cb8f4a4bac9dc10814e843be02ad34856b0b6649fdbf2f1606a0a02a';
            let deblind = '0x03bff9bdeb8cc0c90ffdb7d93a64b804b72570a3710649a77286e1226d66df93';
            let deblindHash = '0xbcacd79334356d554cae21f2001e05a683cc155b34293225ab4421208b827a0a';
            let mHash = '0x76cef4a5570d9a55a89ec45b1b78cf425595f6e684976cfaa27bc25227567fe6';
            const txReq = await verifySig.setRequestSig(wallet.address, c, deblindHash, mHash);
            await txReq.wait();

            // 设置s和t
            let s = '0xef29065cbfa46e6a769932d337f1e12f6ccc0078437a465c63e9afb3bceff3ef';
            let t = '0x0000000000000000000000000000000000000000000000000000000000000000';
            let px = '0xd0988bfa799f7d7ef9ab3de97ef481cd0f75d2367ad456607647edde665d6f6f';
            let py = '0xbdd594388756a7beaf73b4822bc22d36e9bda7db82df2b8b623673eefc0b7495';
            // 模拟切换成其他用户响应签名
            const ResVerifySig = verifySig.connect(wallet);
            // 此时这个账户余额为0，向其转账
            owner.sendTransaction({
                to: wallet.address,
                value: hre.ethers.utils.parseEther('100'),
            });
            const txRes = await ResVerifySig.setResponseSig(owner.address, s, t, px, py);
            await txRes.wait();

            console.log(33);
            // console.log('msg.sender', owner.address);
            let sender = owner.address;
            let receiver = wallet.address;
            let data = {
                sender: sender,
                receiver: receiver,
                message: 'wq',
                c: c,
                deblind: deblind,
                s: s,
                t: t,
                px: 0,
                py: 0,
            };
            const result3 = await verifySig.verifySig(data);
            console.log(result3);
        });
    });
});
