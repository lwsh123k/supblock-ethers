import { Socket } from 'socket.io';
import { logger } from '../util/logger';
import { verifyHashBackward, verifyHashForward } from '../contract/util/verifyHash';
import { getEncryptData } from '../contract/util/utils';
import { PrismaClient } from '@prisma/client';
import { writeFair, writeStoreData } from '../contract/eventListen/validatorListen';
import eccBlind from './eccBlind';
import { AppToRelayData, PreToNextRelayData, NumInfo, ValidatorSendBackSig } from './types';
import {
    addApp2ValidatorData,
    app2ValidatorData,
    hashToBMapping,
    onlineUsers,
    userSig,
} from './usersData';

// 申请盲签名（必须每次都要点chain init, 两个功能: 盲签名和验证正向hash）. validator listening applicant: chain init
let validatorSendBackData = new Map<string, ValidatorSendBackSig>();
export function handleChainInit(socket: Socket, data: AppToRelayData) {
    logger.info('applicant to validator: initialization data');
    // verify data
    let { from, to, r, hf, hb, b, c, chainIndex } = data;
    if (!from || !r || !hf) {
        logger.error('applicant to validator: initialization data, data lack error');
        return;
    }
    let result = verifyHashForward(from!, r!, hf!, null);

    // if right, save and send back to applicant
    if (result) {
        addApp2ValidatorData(from, data, chainIndex);
        // whether it's signed or not
        if (!userSig.has(from)) {
            let eccPoint = eccBlind.getPublicKey();
            //logger.info(`generatedKey:${publicKey.Px}, ${publicKey.Py}`);
            socket.emit('validator send pubkey', eccPoint);
            logger.info('sig not exists, validator has sent pubkey');
        } else if (userSig.has(from)) {
            const value = userSig.get(from);
            if (!value) {
                logger.error(`token hash not found for address ${from}`);
                return;
            }
            let eccPoint = eccBlind.getPublicKey();
            let sendBackData: Partial<ValidatorSendBackSig> = {};
            sendBackData.from = data.to!;
            sendBackData.to = data.from!;
            sendBackData.tokenHash = value.t_hashAry;
            sendBackData.sBlind = value.sBlind;
            sendBackData.chainIndex = data.chainIndex;
            sendBackData.point = eccPoint;
            sendBackData.realToken = value.t_array;
            console.log(sendBackData);
            // socket.emit('hash forward verify correct', sendBackData);
            socket.emit('validator send sig and hash', sendBackData);
            logger.info('sig exists, validator has sig and hash');
        }
    } else {
        logger.info('hash forward is not correct');
    }
}

// validaor给他之后的第一个relay发送消息. validator listening plugin: new page opened, send to next relay
const prisma = new PrismaClient();
export async function handleValidator2Next(socket: Socket, data: NumInfo) {
    logger.info(
        `hash of applicant: ${data.hashOfApplicant}`,
        'plugin to validator: new page opened'
    );
    // select data and encrypt data
    let { from, to, applicant, relay, blindedFairIntNum, hashOfApplicant } = data;

    // 区分哪一条链
    let bAndl = hashToBMapping.get(hashOfApplicant);
    if (!bAndl) {
        logger.error(`hash of applicant: ${hashOfApplicant}, can not found bAndl`);
        return;
    }
    let chainId = bAndl.chainId;
    let dataFromApplicantArray = app2ValidatorData.get(applicant);
    if (!dataFromApplicantArray) {
        logger.error(
            `applicant address: ${applicant}, chain id: ${chainId}, can not found data from applicant array`
        );
        return;
    }
    let dataFromApplicant = dataFromApplicantArray[chainId];
    let token = userSig.get(applicant)?.t_array[chainId];
    if (!token) {
        logger.error(
            `applicant address: ${applicant}, chain id: ${chainId}, can not found token in usersig`
        );
        return;
    }

    if (dataFromApplicant) {
        let { hf, hb, b } = dataFromApplicant;
        if (!hf || !hb || !b) {
            logger.error(dataFromApplicant, 'hf or hb or b is is empty');
            throw new Error('hf or hb or b is is empty');
        }
        try {
            // 此处applicant temp account为applicant real name account
            // let appTempAccount = dataFromApplicant.from;
            // let appTempAccountPubkey = await prisma.supBlock.findFirst({
            //     where: {
            //         address: appTempAccount!,
            //     },
            //     select: {
            //         publicKey: true,
            //     },
            // });
            // let token = '3333333333333333333333333333333333333333333333333333333333333333';
            // let encryptedToken = await getEncryptData(appTempAccountPubkey?.publicKey!, token);

            // 给下一个relay发送信息, 查找对应的address
            let nxetRelay = await prisma.supBlock.findUnique({
                where: {
                    id: blindedFairIntNum + 1,
                },
                select: {
                    publicKey: true,
                    address: true,
                },
            });
            if (nxetRelay === null) throw new Error('error when find public key using index');
            let nextRelayData: PreToNextRelayData = {
                from: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
                to: null,
                preAppTempAccount: applicant,
                preRelayAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
                hf,
                hb,
                b,
                n: blindedFairIntNum,
                t: token!,
                l: 0, // validator's relay index is 0
            };
            nextRelayData.to = nxetRelay.address;
            logger.info(nextRelayData, 'validator sends token to first relay');
            let encryptedData = await getEncryptData(nxetRelay.publicKey, nextRelayData);

            // upload to blockchain
            await writeStoreData.setPre2Next(nxetRelay.address, encryptedData);
            logger.info('validator sends token to first relay: data upload success');
        } catch (error) {
            logger.error(error, 'error when validator upload data to next relay');
        }
    } else {
        logger.error('validator not received data when send data to next relay');
    }
}

type CombinedData = {
    appToRelayData?: AppToRelayData;
    preToNextRelayData?: PreToNextRelayData;
};
// 存储final data(app和relay最后一次将数据发送给validator)
let finalAllAppToValidatorData: AppToRelayData[] = [],
    finalAllPreToValidatorData: PreToNextRelayData[] = [];
export async function handleFinalData(
    userSocket: Socket,
    data: PreToNextRelayData | AppToRelayData
) {
    // save data from applicant or previous relay
    let verifyResult = undefined;
    if (typeof data === 'object' && data !== null && 'appTempAccount' in data) {
        finalAllAppToValidatorData.push(data);
        verifyResult = await verifyData(data, null); // verify data
        console.log('receive final data from app: ', data);
    } else {
        finalAllPreToValidatorData.push(data);
        verifyResult = await verifyData(null, data); // verify data
        console.log('receive final data from previous relay: ', data);
    }

    console.log(verifyResult);
    if (verifyResult === null) {
        console.log('verify not pass');
    } else {
        let toSocketAddress = verifyResult.appToRelayData.appTempAccount;
        let res = {
            from: 'validator',
            to: toSocketAddress,
            verify: true,
            token: verifyResult.preToNextRelayData.t,
            chainId: verifyResult.appToRelayData.chainIndex,
        };
        console.log(res);
        if (toSocketAddress === null) {
            console.log('to socket address is null');
            return;
        }
        let toSocket = onlineUsers[toSocketAddress];
        toSocket.emit('validator send token t', res);
    }
}

async function verifyData(
    applicantData: AppToRelayData | null,
    PreRelayData: PreToNextRelayData | null
) {
    let isAppData = true;
    if (PreRelayData != null) isAppData = false;

    // 从后往前遍历, 避免之前数据的干扰
    for (let i = finalAllAppToValidatorData.length - 1; i >= 0; i--) {
        // 验证applicant数据来源
        let appToRelayData = finalAllAppToValidatorData[i];
        if (
            isAppData &&
            (applicantData!.r != appToRelayData.r || applicantData!.hf != appToRelayData.hf)
        )
            continue;
        for (let j = finalAllPreToValidatorData.length - 1; j >= 0; j--) {
            let preToNextRelayData = finalAllPreToValidatorData[j];
            // 验证relay数据来源
            if (
                !isAppData &&
                (PreRelayData!.hf != preToNextRelayData.hf ||
                    PreRelayData!.t != preToNextRelayData.t)
            )
                continue;
            // 验证正向hash
            let hf = appToRelayData.hf,
                preHf = preToNextRelayData.hf,
                r = appToRelayData.r,
                appTempAccount = appToRelayData.appTempAccount,
                token = preToNextRelayData.t;
            if (!hf || !preHf || !r || !appTempAccount || !token) continue;
            let res1 = verifyHashForward(appTempAccount, r, hf, preHf);
            if (res1) {
                console.log('pass verification');
                return { appToRelayData, preToNextRelayData };
            }
        }
    }

    return null;
}

// hash(l+2) = hash(A(l+2), r(l+2))
export async function handleChainConfirmation(userSocket: Socket, data: AppToRelayData) {
    let currentHash = data.hb;
    if (!currentHash) {
        userSocket.emit('chain confirmation result', { result: false });
        return;
    }
    for (let app2ValidatorData of finalAllAppToValidatorData) {
        let appTempAccount = app2ValidatorData.appTempAccount,
            r = app2ValidatorData.r;
        if (!appTempAccount || !r) continue;
        let res = verifyHashBackward(appTempAccount, r, currentHash, null);
        if (res) {
            userSocket.emit('chain confirmation result', { result: true });
            return;
        }
    }

    userSocket.emit('chain confirmation result', { result: false });
}
