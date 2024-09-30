import { PrismaClient } from '@prisma/client';
import { getFairIntGen } from '../getContractInstance';
import { provider } from '../util/provider';
import { ethers } from 'ethers';
import { sendPluginMessage } from '../../socket/handlePluginMessage';
import { logger } from '../../util/logger';

const prisma = new PrismaClient();

const fairIntGen = getFairIntGen();

export function record() {
    // 记录hash上传事件
    // 请求者hash上传
    let reqHashFilter = fairIntGen.filters.ReqHashUpload(); // 使用filter监听才有提示
    fairIntGen.on(reqHashFilter, async (from, to, infoHash, tA, tB, uploadTime, index, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);

        let res = await prisma.uploadHash.create({
            data: {
                from: from,
                to: to,
                types: 0,
                infoHash: infoHash,
                tA: tA.toString(),
                tB: tB.toString(),
                timestamp: new Date(uploadTime.mul(1000).toNumber()),
                index: index.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        logger.info(`applicant hash (${infoHash}) upload to database`);
    });
    // 响应者hash上传
    let resHashFilter = fairIntGen.filters.ResHashUpload();
    fairIntGen.on(resHashFilter, async (from, to, infoHash, tA, tB, uploadTime, index, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        let res = await prisma.uploadHash.create({
            data: {
                from: from,
                to: to,
                types: 1,
                infoHash: infoHash,
                tA: tA.toString(),
                tB: tB.toString(),
                timestamp: new Date(uploadTime.mul(1000).toNumber()),
                index: index.toString(),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        logger.info(`relay hash (${infoHash}) upload to database`);
    });

    // 记录随机数上传事件
    // 请求者随机数上传
    let reqInfoFilter = fairIntGen.filters.ReqInfoUpload();
    fairIntGen.on(reqInfoFilter, async (from, to, ni, ri, tA, numHash, uploadTime, tB, event) => {
        const transaction = await event.getTransactionReceipt();
        // 判断自己随机数正确性
        const hash = ethers.utils.solidityKeccak256(
            ['uint256', 'uint256', 'uint256', 'uint256'],
            [ni, tA, tB, ri]
        );
        let iscorrect = hash === numHash;
        logger.info(`applicant try to upload num to database (num hash: ${hash})`);
        // 上传信息
        let res = await prisma.uploadNum.create({
            data: {
                from: from,
                to: to,
                types: 0,
                ni: ni.toString(),
                ri: ri.toHexString(),
                t: tA.toString(),
                numHash: numHash,
                timestamp: new Date(uploadTime.mul(1000).toNumber()),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
                correctness: iscorrect,
            },
        });
        // 查询另一方是否正确
        let other = await prisma.uploadHash.findFirst({
            where: { from: to, to: from },
            include: { uploadNum: true },
            orderBy: {
                id: 'desc',
            },
        });
        logger.info({ correctness: iscorrect }, 'applicant random number successfully upload');
        // console.log(iscorrect, other);
        // 如果都正确, 通知extension打开新页面;
        // 没办法知道请求者和响应者谁先上传, 所以都会调用sendPluginMessage, 然后在函数中判断只触发一次
        if (iscorrect && other?.uploadNum?.correctness)
            sendPluginMessage(from, to, (ni.toNumber() + Number(other?.uploadNum?.ni)) % 100, hash);
    });

    // 响应者随机数上传
    let resInfoFilter = fairIntGen.filters.ResInfoUpload();
    fairIntGen.on(resInfoFilter, async (from, to, ni, ri, tB, numHash, uploadTime, tA, event) => {
        const transaction = await provider.getTransactionReceipt(event.transactionHash);
        // 判断自己随机数正确性
        const hash = ethers.utils.solidityKeccak256(
            ['uint256', 'uint256', 'uint256', 'uint256'],
            [ni, tA, tB, ri]
        );
        let iscorrect = hash === numHash;
        logger.info(`relay try to upload num to database (num hash: ${hash})`);
        // 上传随机数
        let res = await prisma.uploadNum.create({
            data: {
                from: from,
                to: to,
                types: 1,
                ni: ni.toString(),
                ri: ri.toHexString(),
                t: tB.toString(),
                numHash: numHash,
                timestamp: new Date(uploadTime.mul(1000).toNumber()),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
                correctness: iscorrect,
            },
        });
        // 查询另一方是否正确
        let other = await prisma.uploadHash.findFirst({
            where: { from: to, to: from },
            include: { uploadNum: true },
            orderBy: {
                id: 'desc',
            },
        });

        logger.info({ correctness: iscorrect }, `relay random number successfully upload`);
        // console.log(iscorrect, other);
        if (iscorrect && other?.uploadNum?.correctness)
            sendPluginMessage(
                to,
                from,
                (ni.toNumber() + Number(other?.uploadNum?.ni)) % 100,
                other.infoHash
            );
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
                ni: ni.toString(),
                ri: ri.toHexString(),
                originalHash: originalHash,
                timestamp: new Date(uploadTime.mul(1000).toNumber()),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        logger.info({ ni: res.ni }, 'applicant random number reupload');
        sendPluginMessage(from, to, ni.toNumber() % 100, originalHash);
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
                ni: ni.toString(),
                ri: ri.toHexString(),
                originalHash: originalHash,
                timestamp: new Date(uploadTime.mul(1000).toNumber()),
                blockNum: event.blockNumber,
                gas: transaction.gasUsed.toNumber(),
            },
        });
        // find applicant's hash through from and to
        let findResult = await prisma.uploadHash.findFirst({
            where: { from: to, to: from },
            select: {
                infoHash: true,
            },
            orderBy: {
                id: 'desc',
            },
        });

        logger.info({ ni: res.ni }, 'relay random number reupload');
        sendPluginMessage(to, from, ni.toNumber() % 100, findResult?.infoHash!);
    });
}
