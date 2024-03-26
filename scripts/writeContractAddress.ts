import fs from 'fs';
import path from 'path';

// 向单个文件中写入合约名, 合约地址
function writeContractAddress(filePath: string, contractName: string, contractAddress: string) {
    // 检查文件是否存在, fs.writeFileSync默认为w模式: 文件不存在就创建; 文件存在就将文件清空,然后再写入
    if (!fs.existsSync(filePath)) {
        let contractAddresses: {
            [key: string]: string | undefined;
        } = {};
        contractAddresses[contractName] = contractAddress;
        let data = `${JSON.stringify(contractAddresses, null, 4)}\n`;
        fs.writeFileSync(filePath, data);

        console.log('File created with initial contract addresses.');
    } else {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file:', err);
                return;
            }

            // 如果文件为空, 创建合约对象; 不为空, 读取原来内容
            let contractAddresses = data.trim() ? JSON.parse(data) : {};
            contractAddresses[contractName] = contractAddress;
            let updatedData = JSON.stringify(contractAddresses, null, 4);
            fs.writeFileSync(filePath, `${updatedData}\n`);
            console.log(`${contractName} address updated successfully`);
        });
    }
}

// 将合约地址写入前端和后端
export function writeToFiles(contractName: string, contractAddress: string) {
    let fileName = 'contract-address.json';
    // let frontendPath = path.join(__dirname, '..', 'app/src/js/contract-interaction', fileName);
    let backendPath = path.join(__dirname, '..', 'backend/src/contract-interaction', fileName);
    // writeContractAddress(frontendPath, contractName, contractAddress);
    writeContractAddress(backendPath, contractName, contractAddress);
}
