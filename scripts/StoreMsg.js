const hre = require('hardhat');
const WriteAddress = require('./write-contract-address.js');

async function main() {
    // hardhat自带ethers.js
    const StoreMsg = await hre.ethers.getContractFactory('StoreMsg');
    console.log('signer address: ', StoreMsg.signer.address);
    // 生成部署合约实例, 可以设置参数, 此时合约还没有部署
    const storeMsg = await StoreMsg.deploy();
    console.log('contract address: ', storeMsg.address);
    WriteAddress.writeToFiles('StoreMsgContract', storeMsg.address);
    await storeMsg.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
