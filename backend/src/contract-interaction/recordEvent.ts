import { PrismaClient } from '@prisma/client';
import { getFairIntGen } from './contract';
import { provider } from './provider';

const prisma = new PrismaClient();

const fairIntGen = getFairIntGen();

export function record() {
    // 记录hash上传事件
    let hashFilter = fairIntGen.filters.UploadHash(); // 使用filter监听才有提示
    fairIntGen.on(hashFilter, async (from, to, types, infoHash, uploadTime, index, event) => {
        console.log(event);
        console.log(infoHash);
        const transaction = await provider.getTransactionReceipt(event.transactionHash);

        let res = await prisma.uploadHash.create({
            data: {
                from: from,
                to: to,
                types: types,
                infoHash: infoHash,
                timestamp: uploadTime.toString(),
                index: index.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        console.log(res);
    });

    // 记录随机数上传事件
    let upLoadFilter = fairIntGen.filters.UpLoadNum();
    fairIntGen.on(upLoadFilter, async (from, to, types, ni, ri, t, numHash, uploadTime, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.uploadNum.create({
            data: {
                from: from,
                to: to,
                types: types,
                ni: ni.toHexString(),
                ri: ri.toHexString(),
                t: t.toHexString(),
                numHash: numHash,
                timestamp: uploadTime.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        console.log(res);
    });

    // 记录随机数重新上传时间
    let reuploadNum = fairIntGen.filters.ReuploadNum();
    fairIntGen.on(reuploadNum, async (from, to, types, ni, ri, originalHash, uploadTime, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.reuploadNum.create({
            data: {
                from: from,
                to: to,
                types: types,
                ni: ni.toHexString(),
                ri: ri.toHexString(),
                originalHash: originalHash,
                timestamp: uploadTime.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        console.log(res);
    });
}

record();
