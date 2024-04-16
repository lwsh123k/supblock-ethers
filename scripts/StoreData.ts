import hre from 'hardhat';
import { writeContractAbi } from './writeContractAbi';
import { writeToFiles } from './writeContractAddress';

export async function storeDataFunction() {
    // 部署合约
    const contractName = 'StoreData';
    const MyContract = await hre.ethers.getContractFactory(contractName);
    const myContract = await MyContract.deploy();

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
}
