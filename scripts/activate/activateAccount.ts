import { ethers } from 'ethers';
import * as fs from 'fs';
import path from 'path';

/**
 * 激活账户的接口
 */
interface AccountInfo {
    idx: number;
    address: string;
    privateKey: string;
    publicKey?: string; // 可选属性，用于存储公钥
}

export async function activateAccount(CONTRACT_ADDRESS: string) {
    const RPC_URL = 'http://127.0.0.1:8545';
    const ABI = [
        'function activateAccount(bytes32 sig, bytes publicKey) external',
        'event ActivateAccount(uint indexed index, address indexed anonymousAccount, bytes publicKey)',
    ];

    // 1. 读取 accounts.txt 文件内容
    const ACCOUNTS_FILE = path.join(__dirname, 'accounts.txt');
    const data = fs.readFileSync(ACCOUNTS_FILE, 'utf8');
    const lines = data.split('\n');

    const accounts: AccountInfo[] = [];
    let currentAccount: Partial<AccountInfo> | null = null;

    // 2. 解析 accounts.txt 文件中的账户信息
    for (const line of lines) {
        const trimmedLine = line.trim();
        const accMatch = trimmedLine.match(/^Account #(\d+): (\S+) \(\d+ ETH\)/);
        if (accMatch) {
            const idx = parseInt(accMatch[1], 10);
            const address = accMatch[2];
            currentAccount = { idx, address };
        } else if (trimmedLine.startsWith('Private Key:')) {
            const pk = trimmedLine.split(':')[1].trim();
            if (currentAccount) {
                currentAccount.privateKey = pk;
                accounts.push(currentAccount as AccountInfo);
                currentAccount = null;
            }
        }
    }

    // 3. 筛选出 index 在 100 到 199 之间的账户
    const subset = accounts.filter((a) => a.idx >= 100 && a.idx <= 199);
    if (subset.length === 0) {
        console.log('No accounts found in the specified range (100-199).');
        return;
    }

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    // 4. 遍历筛选后的账户并调用 activateAccount 函数
    for (const acc of subset) {
        try {
            const wallet = new ethers.Wallet(acc.privateKey, provider);

            // 从钱包获取未压缩的公钥（65 字节）
            const publicKey: string = wallet.publicKey; // 格式为 '0x04...'，65 字节

            // 生成随机 bytes32 签名
            const sig: string = ethers.utils.hexlify(ethers.utils.randomBytes(32)) as `0x${string}`;

            console.log(`\nActivating account #${acc.idx}`);
            console.log(`Address: ${acc.address}`);
            console.log(`Public Key: ${publicKey}`);
            console.log(`Random Signature (sig): ${sig}`);

            // 连接合约与钱包
            const contractWithSigner = contract.connect(wallet);

            // 调用 activateAccount 函数，传递 sig 和 publicKey
            const tx = await contractWithSigner.activateAccount(sig, publicKey);
            console.log(`Transaction sent: ${tx.hash}`);

            // 等待交易被挖矿
            // const receipt = await tx.wait();
            // console.log(`Transaction mined in block ${receipt.blockNumber}`);

            // 解析事件日志以确认激活
            // const event = receipt.events?.find((e: any) => e.event === 'ActivateAccount');
            // if (event) {
            //     const { index, anonymousAccount, publicKey: emittedPublicKey } = event.args;
            //     console.log(`Activated Account Details:`);
            //     console.log(`Index: ${index.toString()}`);
            //     console.log(`Address: ${anonymousAccount}`);
            //     console.log(`Public Key: ${emittedPublicKey}`);
            // } else {
            //     console.log('ActivateAccount event not found in the transaction receipt.');
            // }
        } catch (error) {
            console.error(`Error activating account #${acc.idx} (${acc.address}):`, error);
        }
    }
}

// const CONTRACT_ADDRESS = '0x';
// activateAccount(CONTRACT_ADDRESS).catch((error) => {
//     console.error('Unexpected error:', error);
//     process.exit(1);
// });
