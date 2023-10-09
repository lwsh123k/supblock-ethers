const fs = require('fs');
const path = require('path');

const fileName = 'contractAddress.json';
const filePath = path.join(__dirname, '..', 'app/src/js', fileName);
// d:\code\supblock-ethers\app\js\contractAddresses.js
// console.log(filePath);

// 指定合约名, 合约地址
// 当每次部署合约时, 不再需要每次都在前端文件中手动更新合约地址
function writeContractAddress(contractName, contractAddress) {
    // 检查文件是否存在, fs.writeFileSync默认为w模式: 文件不存在就创建; 文件存在就将文件清空,然后再写入
    if (!fs.existsSync(filePath)) {
        let contractAddresses = {};
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
            console.log('Address updated successfully.');
        });
    }
}

module.exports.writeContractAddress = writeContractAddress;
