import fs, { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// 向单个文件中写入合约名, 合约地址
async function writeContractAddress(
    filePath: string,
    contractName: string,
    contractAddress: string
) {
    // 检查文件是否存在, fs.writeFileSync默认为w模式: 文件不存在就创建; 文件存在就将文件清空,然后再写入
    if (!existsSync(filePath)) {
        let contractAddresses: {
            [key: string]: string | undefined;
        } = {};
        contractAddresses[contractName] = contractAddress;
        let data = `${JSON.stringify(contractAddresses, null, 4)}\n`;
        await fs.writeFile(filePath, data);

        console.log('File created with initial contract addresses.');
    } else {
        const contents = await readFile(filePath, { encoding: 'utf8' });
        // 如果文件为空, 创建合约对象; 不为空, 读取原来内容
        let contractAddresses = contents.trim() ? JSON.parse(contents) : {};
        contractAddresses[contractName] = contractAddress;
        let updatedData = JSON.stringify(contractAddresses, null, 4);
        await fs.writeFile(filePath, `${updatedData}\n`);
        console.log(`${contractName} address updated successfully`);
    }
}

// 将合约地址写入前端和后端
export async function writeToFiles(contractName: string, contractAddress: string) {
    let fileName = 'contract-address.json';
    // let frontendPath = path.join(__dirname, '..', 'app/src/js/contract-interaction', fileName);
    let backendPath = path.join(__dirname, '..', 'backend/src/contract', fileName);
    // writeContractAddress(frontendPath, contractName, contractAddress);
    await writeContractAddress(backendPath, contractName, contractAddress);
}
