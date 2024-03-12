// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import { ethers } from 'hardhat';
import WriteAddress from './write-contract-address.js';

async function main() {
    // hardhat自带ethers.js
    const FairInteger = await ethers.getContractFactory('FairInteger');
    console.log('signer address: ', await FairInteger.signer.getAddress());
    // 生成部署合约实例, 可以设置参数, 此时合约还没有部署
    const fairInteger = await FairInteger.deploy(30, 30);
    console.log('contract address: ', fairInteger.address);

    // 将合约地址写入前端和后端
    WriteAddress.writeToFiles('fairIntGenAddress', fairInteger.address);
    await fairInteger.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
