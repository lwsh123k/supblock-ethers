// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');

async function main() {
    const MyToken = await hre.ethers.getContractFactory('LockERC20');
    const totalSupply = hre.ethers.utils.parseEther('100000'); //将原数100000乘以10^18，得到单位Ether
    const myToken = await MyToken.deploy('myToken', 'myToken', totalSupply);

    await myToken.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
