// 引入fs模块用于文件写入
import fs from 'fs';
// 引入path模块用于处理文件路径
import path from 'path';
// 引入Hardhat环境
import hre from 'hardhat';

async function main() {
    // 编译合约
    await hre.run('compile');

    // 指定合约名称和输出ABI的文件名
    const contractName = 'YourContract'; // 修改为你的合约名称
    const abiOutputFile = path.join(__dirname, `${contractName}ABI.json`);

    // 获取合约的Artifact
    const artifact = await hre.artifacts.readArtifact(contractName);

    // 提取ABI
    const abi = JSON.stringify(artifact.abi, null, 2);

    // 将ABI写入文件
    fs.writeFileSync(abiOutputFile, abi);
    console.log(`ABI has been written to ${abiOutputFile}`);
}

// 运行主函数并处理可能出现的错误
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
