// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import hre from 'hardhat';
import { writeContractAbi } from './writeContractAbi';
import { writeToFiles } from './writeContractAddress';

export async function fairIntegerFunction() {
    // 部署合约
    const contractName = 'FairInteger';
    const MyContract = await hre.ethers.getContractFactory(contractName);
    const myContract = await MyContract.deploy(30, 30);

    // 等待部署完成
    await myContract.deployed();
    console.log(`${contractName} deployed to:`, myContract.address);

    // 保存合约信息到JSON文件
    const FormatTypes = hre.ethers.utils.FormatTypes;
    const contractData = {
        address: myContract.address,
        abi: JSON.parse(myContract.interface.format(FormatTypes.json) as string),
    };

    await writeContractAbi(contractName, contractData);
    await writeToFiles(contractName, myContract.address);
    return myContract.address;
}
