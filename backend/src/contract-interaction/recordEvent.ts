import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { fairIntegerAbi } from './abi';
import address from './contract-address.json';

const prisma = new PrismaClient();

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const contract = new ethers.Contract(address.fairIntGenAddress, fairIntegerAbi, provider);

export function record() {
    // 记录hash上传事件
    contract.on('uploadHash', async (from, to, types, infoHash, event) => {
        console.log(event);
        console.log(infoHash);
        const block = await provider.getBlock(event.blockNumber);
        const transaction = await provider.getTransactionReceipt(event.transactionHash);

        await prisma.uploadHash.create({
            data: {
                from: from,
                to: to,
                types: types,
                infoHash: ethers.utils.hexlify(infoHash),
                timestamp: new Date(block.timestamp * 1000), // 将Unix时间戳转换为JavaScript日期对象
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
    });

    // 记录随机数上传事件
    contract.on('UpLoadNum', async (from, to, types, state, ni, ri, t, event) => {
        const block = await provider.getBlock(event.blockNumber);
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        await prisma.upLoadNum.create({
            data: {
                from: from,
                to: to,
                types: types,
                state: state,
                ni: ni.toHexString(),
                ri: ri.toHexString(),
                t: t.toHexString(),
                timestamp: new Date(block.timestamp * 1000), // 将Unix时间戳转换为JavaScript日期对象
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
    });
}
