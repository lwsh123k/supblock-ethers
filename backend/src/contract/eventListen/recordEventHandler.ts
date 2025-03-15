import { ethers } from 'ethers';
import { logger } from '../../util/logger';
import { PrismaClient } from '@prisma/client';
import { sendPluginMessage } from '../../socket/handlePluginMessage';
import { sendRelayInfo } from '../../socket/monitorRelayInfo';
import {
    App2RelayEventEventObject,
    Pre2NextEventEventObject,
    RelayResEvidenceEventEventObject,
} from '../types/StoreData';
import {
    ReqHashUploadEventObject,
    ReqInfoUploadEventObject,
    ReqReuploadNumEventObject,
    ResHashUploadEventObject,
    ResInfoUploadEventObject,
    ResReuploadNumEventObject,
} from '../types/FairInteger';

const prisma = new PrismaClient();

// req hash
export async function handleReqHashUpload(
    txHash: string,
    args: ReqHashUploadEventObject,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, infoHashA, tA, tB, index } = args;
    let res = await prisma.uploadHash.create({
        data: {
            transactionHash: txHash,
            from: from,
            to: to,
            types: 0,
            infoHash: infoHashA,
            tA: tA.toString(),
            tB: tB.toString(),
            index: index.toString(),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });
    logger.info(`applicant hash (${infoHashA}) upload to database`);
}

// res hash
export async function handleResHashUpload(
    txHash: string,
    args: ResHashUploadEventObject,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, infoHashB: infoHash, tA, tB, index } = args;
    let res = await prisma.uploadHash.create({
        data: {
            transactionHash: txHash,
            from: from,
            to: to,
            types: 1,
            infoHash: infoHash,
            tA: tA.toString(),
            tB: tB.toString(),
            index: index.toString(),
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });
    logger.info(`relay hash (${infoHash}) upload to database`);
}

// req num
export async function handleReqInfoUpload(
    txHash: string,
    args: ReqInfoUploadEventObject,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, ni, ri, tA, hashA: numHashA, hashB: numHashB, tB } = args;
    // 判断自己随机数正确性
    const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256', 'uint256'],
        [ni, tA, tB, ri]
    );
    let iscorrect = hash === numHashA;
    // logger.info(`applicant try to upload num to database (num hash: ${hash})`);
    // 上传信息
    let res = await prisma.uploadNum.create({
        data: {
            transactionHash: txHash,
            from: from,
            to: to,
            types: 0,
            ni: ni.toString(),
            ri: ri.toHexString(),
            t: tA.toString(),
            numHashA,
            numHashB,
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
            correctness: iscorrect,
        },
    });
    // 查询另一方是否正确, 倒序查找满足条件的第一个
    let other = await prisma.uploadNum.findFirst({
        where: { from: to, to: from, numHashB },
        orderBy: {
            id: 'desc',
        },
    });
    logger.info(
        { 'applicant hash': hash, correctness: iscorrect, 'relay tx info': other },
        'applicant upload random number'
    );

    // 如果都正确, 通知extension打开新页面;
    // 没办法知道请求者和响应者谁先上传, 所以都会调用sendPluginMessage, 然后在函数中判断只触发一次
    if (iscorrect && other?.correctness) {
        sendPluginMessage(from, to, (ni.toNumber() + Number(other?.ni)) % 99, hash);
        await sendRelayInfo(from, to, (ni.toNumber() + Number(other?.ni)) % 99, hash);
    }
}

// res num
export async function handleResInfoUpload(
    txHash: string,
    args: ResInfoUploadEventObject,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, ni, ri, tB, hashA: numHashA, hashB: numHashB, tA } = args;
    // 判断自己随机数正确性
    const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256', 'uint256'],
        [ni, tA, tB, ri]
    );
    let iscorrect = hash === numHashB;
    // logger.info(`relay try to upload num to database (num hash: ${hash})`);
    // 上传随机数
    let res = await prisma.uploadNum.create({
        data: {
            transactionHash: txHash,
            from: from,
            to: to,
            types: 1,
            ni: ni.toString(),
            ri: ri.toHexString(),
            t: tB.toString(),
            numHashA,
            numHashB,
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
            correctness: iscorrect,
        },
    });
    // 查询另一方是否正确
    let other = await prisma.uploadNum.findFirst({
        where: { from: to, to: from, numHashA },
        orderBy: {
            id: 'desc',
        },
    });

    logger.info(
        { 'relay hash': hash, correctness: iscorrect, 'applicant tx info': other },
        `relay random number successfully upload`
    );
    if (iscorrect && other?.correctness) {
        sendPluginMessage(to, from, (ni.toNumber() + Number(other?.ni)) % 99, numHashA);
        await sendRelayInfo(to, from, (ni.toNumber() + Number(other?.ni)) % 99, numHashA);
    }
}

// req reupload
export async function handleReqReuploadNum(
    txHash: string,
    args: ReqReuploadNumEventObject,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, ni, ri, originalHashA, originalHashB } = args;
    let res = await prisma.reuploadNum.create({
        data: {
            transactionHash: txHash,
            from: from,
            to: to,
            types: 0,
            ni: ni.toString(),
            ri: ri.toHexString(),
            originalHashA,
            originalHashB,
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });
    logger.info({ from, to, ni: res.ni }, 'applicant random number reupload');
    sendPluginMessage(from, to, ni.toNumber() % 99, originalHashA);
    await sendRelayInfo(from, to, ni.toNumber() % 99, originalHashA);
}

// res reupload
export async function handleResReuploadNum(
    txHash: string,
    args: ResReuploadNumEventObject,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    let { from, to, ni, ri, originalHashA, originalHashB } = args;
    let res = await prisma.reuploadNum.create({
        data: {
            transactionHash: txHash,
            from: from,
            to: to,
            types: 1,
            ni: ni.toString(),
            ri: ri.toHexString(),
            originalHashA,
            originalHashB,
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });

    logger.info({ from, to, ni: res.ni }, 'relay random number reupload');
    sendPluginMessage(to, from, ni.toNumber() % 99, originalHashA);
    await sendRelayInfo(to, from, ni.toNumber() % 99, originalHashA);
}

// 处理 App2RelayEvent
export async function handleApp2RelayEvent(
    txHash: string,
    args: App2RelayEventEventObject,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    const { from, relay, data, dataHash, infoHash } = args;
    await prisma.app2RelayEvent.create({
        data: {
            transactionHash: txHash,
            from,
            relay,
            data,
            dataHash,
            infoHash,
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });

    console.log('App2RelayEvent detected:', {
        from,
        relay,
        data,
        dataHash,
        infoHash,
        blockNumber,
        gas: gasUsed.toNumber(),
    });
}

// 处理 Pre2NextEvent
export async function handlePre2NextEvent(
    txHash: string, // tx hash
    args: Pre2NextEventEventObject, // 使用 TypeChain 生成的类型
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    const { from, relay, data, dataHash, tokenHash } = args;
    await prisma.pre2NextEvent.create({
        data: {
            transactionHash: txHash,
            from,
            relay,
            data,
            dataHash,
            tokenHash,
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });
    console.log('Pre2NextEvent detected:', {
        from,
        relay,
        data,
        dataHash,
        tokenHash,
        blockNumber,
        gas: gasUsed.toNumber(),
    });
}

// 处理 RelayResEvidenceEvent
export async function handleRelayResEvidenceEvent(
    txHash: string,
    args: RelayResEvidenceEventEventObject,
    blockNumber: number,
    gasUsed: ethers.BigNumber
) {
    const {
        relayAnonymousAccount,
        appTempAccount,
        data,
        dataHash,
        app2RelayResEvidence,
        pre2NextResEvidence,
        infoHash,
    } = args;
    await prisma.relayResEvidenceEvent.create({
        data: {
            transactionHash: txHash,
            relayAnonymousAccount,
            appTempAccount,
            data,
            dataHash,
            app2RelayResEvidence,
            pre2NextResEvidence,
            infoHash,
            blockNum: blockNumber,
            gas: gasUsed.toNumber(),
        },
    });
    console.log('RelayResEvidenceEvent detected:', {
        relayAnonymousAccount,
        appTempAccount,
        data,
        dataHash,
        app2RelayResEvidence,
        pre2NextResEvidence,
        blockNumber,
        gas: gasUsed.toNumber(),
    });
}
