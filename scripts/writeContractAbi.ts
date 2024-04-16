import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function writeContractAbi(
    contractName: string,
    contractData: { address: string; abi: string },
    fileDirectory: string = 'backend/src/contract-interaction/abi'
) {
    // 写入abi
    const targetDir = path.join(__dirname, '..', fileDirectory);
    const targetFile = path.join(targetDir, `${contractName}.json`);
    if (!existsSync(targetDir)) {
        await fs.mkdir(targetDir, { recursive: true });
    }
    await fs.writeFile(targetFile, JSON.stringify(contractData.abi, null, 2));
    console.log(`Contract information saved to ${targetFile}`);
}
