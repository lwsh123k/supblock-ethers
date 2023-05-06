const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');
const hre = require('hardhat');

describe('LockERC20', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployERC20() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const MyToken = await hre.ethers.getContractFactory('LockERC20');
        const totalSupply = hre.ethers.utils.parseEther('100000'); //将原数100000乘以10^18，得到单位Ether
        const myToken = await MyToken.deploy('myToken', 'myToken', totalSupply);

        return { myToken, totalSupply, owner, otherAccount };
    }

    describe('Deployment', function () {
        it('Check owner balance', async function () {
            const { myToken, totalSupply, owner, otherAccount } = await loadFixture(deployERC20);

            expect(await myToken.balanceOf(owner.address)).to.equal(totalSupply);
        });

        it('Should revert with the right error if locked transaction is called', async function () {
            const { myToken, totalSupply, owner, otherAccount } = await loadFixture(deployERC20);
            // get lockid
            const tx = await myToken.lockTransfer(
                otherAccount.address,
                hre.ethers.utils.parseEther('10')
            );
            const txReceipt = await tx.wait();
            expect(await myToken.balanceOf(owner.address)).to.equal(
                totalSupply.sub(hre.ethers.utils.parseEther('10'))
            );

            lockid = txReceipt.events[1].args.lockid;
            console.log(txReceipt.events[1].args.lockid);
            console.log(typeof lockid);
            try {
                await myToken.unlockTransfer(lockid);
            } catch (error) {
                console.dir(error);
                console.log(Object.keys(error));
                console.log(error.reason);
                console.log(error.message);
            }
            await expect(myToken.unlockTransfer(lockid)).to.be.revertedWith('locked transaction');
        });
    });
});
