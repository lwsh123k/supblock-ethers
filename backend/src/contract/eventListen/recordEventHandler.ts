import { ethers } from 'ethers';
import { logger } from '../../util/logger';
import { PrismaClient } from '@prisma/client';
import { sendPluginMessage } from '../../socket/handlePluginMessage';

const prisma = new PrismaClient();

// req hash
export async function handleReqHashUpload(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, infoHashA, tA, tB, uploadTime, index } = args;
    let res = await prisma.uploadHash.upsert({
        where: {
            infoHash: infoHashA,
        },
        update: {
            from: from,
            to: to,
            types: 0,
            infoHash: infoHashA,
            tA: tA.toString(),
            tB: tB.toString(),
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            index: index.toString(),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
        create: {
            from: from,
            to: to,
            types: 0,
            infoHash: infoHashA,
            tA: tA.toString(),
            tB: tB.toString(),
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            index: index.toString(),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });
    logger.info(`applicant hash (${infoHashA}) upload to database`);
}

// res hash
export async function handleResHashUpload(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, infoHashB: infoHash, tA, tB, uploadTime, index } = args;
    let res = await prisma.uploadHash.upsert({
        where: {
            infoHash: infoHash,
        },
        update: {
            from: from,
            to: to,
            types: 1,
            infoHash: infoHash,
            tA: tA.toString(),
            tB: tB.toString(),
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            index: index.toString(),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
        create: {
            from: from,
            to: to,
            types: 1,
            infoHash: infoHash,
            tA: tA.toString(),
            tB: tB.toString(),
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            index: index.toString(),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });
    logger.info(`relay hash (${infoHash}) upload to database`);
}

// req num
export async function handleReqInfoUpload(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, ni, ri, tA, hashA: numHash, uploadTime, tB } = args;
    // 判断自己随机数正确性
    const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256', 'uint256'],
        [ni, tA, tB, ri]
    );
    let iscorrect = hash === numHash;
    logger.info(`applicant try to upload num to database (num hash: ${hash})`);
    // 上传信息
    let res = await prisma.uploadNum.upsert({
        where: {
            numHash: numHash,
        },
        create: {
            from: from,
            to: to,
            types: 0,
            ni: ni.toString(),
            ri: ri.toHexString(),
            t: tA.toString(),
            numHash: numHash,
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
            correctness: iscorrect,
        },
        update: {
            from: from,
            to: to,
            types: 0,
            ni: ni.toString(),
            ri: ri.toHexString(),
            t: tA.toString(),
            numHash: numHash,
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
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
        sendPluginMessage(from, to, (ni.toNumber() + Number(other?.uploadNum?.ni)) % 99, hash);
}

// res num
export async function handleResInfoUpload(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, ni, ri, tB, hashB: numHash, uploadTime, tA } = args;
    // 判断自己随机数正确性
    const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256', 'uint256'],
        [ni, tA, tB, ri]
    );
    let iscorrect = hash === numHash;
    logger.info(`relay try to upload num to database (num hash: ${hash})`);
    // 上传随机数
    let res = await prisma.uploadNum.upsert({
        where: {
            numHash: numHash,
        },
        create: {
            from: from,
            to: to,
            types: 1,
            ni: ni.toString(),
            ri: ri.toHexString(),
            t: tB.toString(),
            numHash: numHash,
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
            correctness: iscorrect,
        },
        update: {
            from: from,
            to: to,
            types: 1,
            ni: ni.toString(),
            ri: ri.toHexString(),
            t: tB.toString(),
            numHash: numHash,
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
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
            (ni.toNumber() + Number(other?.uploadNum?.ni)) % 99,
            other.infoHash
        );
}

// req reupload
export async function handleResReuploadNum(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, ni, ri, originalHash, uploadTime } = args;
    let res = await prisma.reuploadNum.upsert({
        where: {
            originalHash: originalHash,
        },
        create: {
            from: from,
            to: to,
            types: 0,
            ni: ni.toString(),
            ri: ri.toHexString(),
            originalHash: originalHash,
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
        update: {
            from: from,
            to: to,
            types: 0,
            ni: ni.toString(),
            ri: ri.toHexString(),
            originalHash: originalHash,
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });
    logger.info({ ni: res.ni }, 'applicant random number reupload');
    sendPluginMessage(from, to, ni.toNumber() % 99, originalHash);
}

// res reupload
export async function handleReqReuploadNum(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, ni, ri, originalHash, uploadTime } = args;
    let res = await prisma.reuploadNum.upsert({
        where: {
            originalHash: originalHash,
        },
        create: {
            from: from,
            to: to,
            types: 1,
            ni: ni.toString(),
            ri: ri.toHexString(),
            originalHash: originalHash,
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
        update: {
            from: from,
            to: to,
            types: 1,
            ni: ni.toString(),
            ri: ri.toHexString(),
            originalHash: originalHash,
            timestamp: new Date(uploadTime.mul(1000).toNumber()),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
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
    sendPluginMessage(to, from, ni.toNumber() % 99, findResult?.infoHash!);
}

// 处理 App2RelayEvent
export async function handleApp2RelayEvent(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    const { from, relay, data, dataHash, dataIndex, lastRelay } = args;
    let dataIndexNumber = dataIndex.toNumber();
    await prisma.app2RelayEvent.upsert({
        where: { dataHash }, // 使用 dataHash 作为唯一标识来查找是否已有该事件
        update: {
            from,
            relay,
            data,
            dataIndex: dataIndexNumber,
            lastRelay,
            blockNum: blockNumber,
            createdAt: new Date(), // 更新事件的记录时间
        },
        create: {
            from,
            relay,
            data,
            dataHash,
            dataIndex: dataIndexNumber,
            lastRelay,
            blockNum: blockNumber,
            createdAt: new Date(),
        },
    });

    console.log('App2RelayEvent detected:', {
        from,
        relay,
        data,
        dataHash,
        dataIndex: dataIndexNumber,
        lastRelay,
        blockNumber,
        gasUsed,
    });
    // 可以将数据存入数据库，或执行其他业务逻辑
}

// 处理 Pre2NextEvent
export async function handlePre2NextEvent(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    const { from, relay, data, dataIndex } = args;
    let dataIndexNumber = dataIndex.toNumber();
    await prisma.pre2NextEvent.upsert({
        where: {
            from_relay_dataIndex: {
                // 将组合唯一键封装为对象
                from,
                relay,
                dataIndex: dataIndexNumber,
            },
        },
        update: {
            data,
            blockNum: blockNumber,
            createdAt: new Date(), // 更新事件的记录时间
        },
        create: {
            from,
            relay,
            data,
            dataIndex: dataIndexNumber,
            blockNum: blockNumber,
            createdAt: new Date(),
        },
    });
    console.log('Pre2NextEvent detected:', {
        from,
        relay,
        data,
        dataIndex: dataIndexNumber,
        blockNumber,
        gasUsed,
    });
}

// 处理 RelayResEvidenceEvent
export async function handleRelayResEvidenceEvent(
    args: ethers.utils.Result,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    const { relayRealAccount, appTempAccount, data, dataHash, chainIndex } = args;
    await prisma.relayResEvidenceEvent.upsert({
        where: { dataHash }, // 使用 dataHash 作为唯一标识来查找是否已有该事件
        update: {
            relayRealAccount,
            appTempAccount,
            data,
            chainIndex,
            blockNum: blockNumber,
            createdAt: new Date(), // 更新事件的记录时间
        },
        create: {
            relayRealAccount,
            appTempAccount,
            data,
            dataHash,
            chainIndex,
            blockNum: blockNumber,
            createdAt: new Date(),
        },
    });
    console.log('RelayResEvidenceEvent detected:', {
        relayRealAccount,
        appTempAccount,
        data,
        dataHash,
        chainIndex,
        blockNumber,
        gasUsed,
    });
}
