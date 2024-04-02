import { PrismaClient } from '@prisma/client';
import { getFairIntGen } from './contract';
import { provider } from './provider';

const prisma = new PrismaClient();

const fairIntGen = getFairIntGen();

export function record() {
    // 记录hash上传事件
    // 请求者hash上传
    let reqHashFilter = fairIntGen.filters.ReqHashUpload(); // 使用filter监听才有提示
    fairIntGen.on(reqHashFilter, async (from, to, infoHash, tA, tB, uploadTime, index, event) => {
        console.log(event);
        console.log(infoHash);
        const transaction = await provider.getTransactionReceipt(event.transactionHash);

        let res = await prisma.uploadHash.create({
            data: {
                from: from,
                to: to,
                types: 0,
                infoHash: infoHash,
                tA: tA.toString(),
                tB: tB.toString(),
                timestamp: uploadTime.toString(),
                index: index.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        console.log(res);
    });
    // 响应者hash上传
    let resHashFilter = fairIntGen.filters.ResHashUpload();
    fairIntGen.on(resHashFilter, async (from, to, infoHash, tA, tB, uploadTime, index, event) => {
        console.log(event);
        console.log(infoHash);
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.uploadHash.create({
            data: {
                from: from,
                to: to,
                types: 1,
                infoHash: infoHash,
                tA: tA.toString(),
                tB: tB.toString(),
                timestamp: uploadTime.toString(),
                index: index.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        console.log(res);
    });

    // 记录随机数上传事件
    // 请求者随机数上传
    let reqInfoFilter = fairIntGen.filters.ReqInfoUpload();
    fairIntGen.on(reqInfoFilter, async (from, to, ni, ri, t, numHash, uploadTime, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.uploadNum.create({
            data: {
                from: from,
                to: to,
                types: 0,
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
    // 响应者随机数上传
    let resInfoFilter = fairIntGen.filters.ResInfoUpload();
    fairIntGen.on(resInfoFilter, async (from, to, ni, ri, t, numHash, uploadTime, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.uploadNum.create({
            data: {
                from: from,
                to: to,
                types: 1,
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
    // 请求者随机数上传
    let reqReuploadNum = fairIntGen.filters.ReqReuploadNum();
    fairIntGen.on(reqReuploadNum, async (from, to, ni, ri, originalHash, uploadTime, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.reuploadNum.create({
            data: {
                from: from,
                to: to,
                types: 0,
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
    // 响应者随机数上传
    let resReuploadNum = fairIntGen.filters.ResReuploadNum();
    fairIntGen.on(resReuploadNum, async (from, to, ni, ri, originalHash, uploadTime, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.reuploadNum.create({
            data: {
                from: from,
                to: to,
                types: 1,
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
