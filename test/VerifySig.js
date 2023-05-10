const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const hre = require('hardhat');

describe('VerifySig', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function VerifySig() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const VerifySig = await hre.ethers.getContractFactory('VerifySig');
        const verifySigInstance = await VerifySig.deploy();

        return { verifySigInstance, owner, otherAccount };
    }

    describe('Deployment', function () {
        it('Check set sig info', async function () {
            const { verifySigInstance, owner, otherAccount } = await loadFixture(SigInfo);
            let message = 'sdd';
            // 设置cHash和mHash
            let c = '0x57ce8f737a1e642a0673d7628cde6828a00ba598ab1071a086f9224eea0bb03c';
            // let m = '0x76cef4a5570d9a55a89ec45b1b78cf425595f6e684976cfaa27bc25227567fe6';

            // 设置s和t
            let s = '0x45244eace039dfa13f5966c968295f3d658bca047a7a80d56da3001c53491fa9';
            let t = '0xe3dfd329a3925ca34b35c950985da4e2c1ed510bb4fcedf5cf207cfbbc4808c3';

            const result1 = await verifySigInstance.verifySig(otherAccount.address);
            console.log(result1);

            //expect(await sigInfo.getAllSigs()).to.equal(totalSupply);
        });
    });
});
