const { time, loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { expect } = require('chai');
const hre = require('hardhat');

describe('ERC20', function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployERC20() {
        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const MyToken = await hre.ethers.getContractFactory('ERC20');
        const totalSupply = hre.ethers.utils.parseEther('100000'); //将原数100000乘以10^18，得到单位Ether
        const myToken = await MyToken.deploy('myToken', 'myToken', totalSupply);

        return { myToken, totalSupply, owner, otherAccount };
    }

    describe('Deployment', function () {
        it('Check owner balance', async function () {
            const { myToken, totalSupply, owner } = await loadFixture(deployERC20);

            expect(await myToken.balanceOf(owner.address)).to.equal(totalSupply);
        });
    });
});
