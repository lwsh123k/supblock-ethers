import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { fairIntegerAbi } from './abi';
import address from './contract-address.json';

const prisma = new PrismaClient();

const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const contract = new ethers.Contract(address.fairIntGenAddress, fairIntegerAbi, provider);

export function record() {
    // 记录hash上传事件
    contract.on('UploadHash', async (from, to, types, infoHash, uploadTime, index, event) => {
        console.log(event);
        console.log(infoHash);
        const transaction = await provider.getTransactionReceipt(event.transactionHash);

        let res = await prisma.uploadHash.create({
            data: {
                from: from,
                to: to,
                types: types,
                infoHash: ethers.utils.hexlify(infoHash), // bytes32在js中对应的是16进制字符串
                uploadTime: uploadTime.toString(),
                index: index.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        console.log(res);
    });

    // 记录随机数上传事件
    contract.on('UpLoadNum', async (from, to, types, ni, ri, t, uploadTime, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.upLoadNum.create({
            data: {
                from: from,
                to: to,
                types: types,
                ni: ni.toHexString(),
                ri: ri.toHexString(),
                t: t.toHexString(),
                uploadTime: uploadTime.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        console.log(res);
    });

    // 记录随机数重新上传时间
    contract.on('ReuploadNum', async (from, to, types, ni, ri, uploadTime, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.reupLoadNum.create({
            data: {
                from: from,
                to: to,
                types: types,
                ni: ni.toHexString(),
                ri: ri.toHexString(),
                uploadTime: uploadTime.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        console.log(res);
    });
}

record();
