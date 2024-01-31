const hre = require('hardhat');
const WriteAddress = require('./write-contract-address.js');

async function main() {
    // hardhat自带ethers.js
    const StoreData = await hre.ethers.getContractFactory('StoreData');
    console.log('signer address: ', StoreData.signer.address);
    // 生成部署合约实例, 可以设置参数, 此时合约还没有部署
    const storeData = await StoreData.deploy();
    console.log('contract address: ', storeData.address);
    WriteAddress.writeToFiles('storeDataAddress', storeData.address);
    await storeData.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
