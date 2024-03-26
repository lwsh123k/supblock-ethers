import fs from 'fs';
import path from 'path';

export async function writeContractAbi(
    contractName: string,
    contractData: { address: string; abi: string },
    fileDirectory: string = 'backend/src/contract-interaction/abi'
) {
    // 写入abi
    const targetDir = path.join(__dirname, '..', fileDirectory);
    const targetFile = path.join(targetDir, `${contractName}.json`);
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetFile, JSON.stringify(contractData.abi, null, 2));
    console.log(`Contract information saved to ${targetFile}`);
}
