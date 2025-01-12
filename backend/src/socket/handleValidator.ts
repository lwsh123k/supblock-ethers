import { Socket } from 'socket.io';
import { logger } from '../util/logger';
import { verifyHashBackward, verifyHashForward } from '../contract/util/verifyHash';
import { ensure0xPrefix, getEncryptData, keccak256 } from '../contract/util/utils';
import { writeFair, writeStoreData } from '../contract/eventListen/validatorListen';
import eccBlind from './eccBlind';
import { AppToRelayData, PreToNextRelayData, NumInfo, ValidatorSendBackSig } from './types';
import {
    saveApp2ValidatorInitData,
    app2ValidatorData,
    hashToBMapping,
    onlineUsers,
    userSig,
    prisma,
    saveFinalData,
} from './usersData';
import { getAccountInfoByContract } from '../contract/util/getOnChainData';

// 申请盲签名（必须每次都要点chain init, 两个功能: 盲签名和验证正向hash）. validator listening applicant: chain init
let validatorSendBackData = new Map<string, ValidatorSendBackSig>();
export async function handleChainInit(socket: Socket, data: AppToRelayData) {
    logger.info('applicant to validator: initialization data');
    // verify data
    let { from, to, r, hf, hb, b, c, chainIndex } = data;
    if (from == null || to == null || r == null || hf == null || b == null || r == null) {
        logger.error('applicant to validator: initialization data, data lack error');
        return;
    }
    let result = verifyHashForward(from, r, hf, null);

    // if right, save and send back to applicant
    if (result) {
        await saveApp2ValidatorInitData(from, data, chainIndex);
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

// validaor -> next relay: 监听来自插件的信息: 当新页面打开时, 给下一个relay的匿名账户发送信息
export async function handleValidator2Next(socket: Socket, data: NumInfo) {
    logger.info(
        `hash of applicant: ${data.hashOfApplicant}`,
        'plugin to validator: new page opened'
    );
    // select data and encrypt data
    let { from, to, applicant, relay, blindedFairIntNum, hashOfApplicant } = data;

    // 区分哪一条链
    let bAndl = hashToBMapping.get(hashOfApplicant);
    if (bAndl == null) {
        logger.error(`hash of applicant: ${hashOfApplicant}, can not found bAndl`);
        return;
    }
    let chainId = bAndl.chainId;
    let dataFromApplicantArray = app2ValidatorData.get(applicant);
    if (dataFromApplicantArray == null) {
        logger.error(
            `applicant address: ${applicant}, chain id: ${chainId}, can not found data from applicant array`
        );
        return;
    }
    let dataFromApplicant = dataFromApplicantArray[chainId];
    let token = userSig.get(applicant)?.t_array[chainId];
    if (token == null) {
        logger.error(
            `applicant address: ${applicant}, chain id: ${chainId}, can not found token in usersig`
        );
        return;
    }

    if (dataFromApplicant) {
        let { hf, hb, b } = dataFromApplicant;
        if (hf == null || hb == null || b == null) {
            logger.error(dataFromApplicant, 'hf or hb or b is is empty');
            throw new Error('hf or hb or b is is empty');
        }
        try {
            // 查找下一个relay的匿名账户
            let nextRelayAnonymousAccount = await getAccountInfoByContract(blindedFairIntNum);
            if (nextRelayAnonymousAccount === null)
                throw new Error('error when find public key using index');
            let data: PreToNextRelayData = {
                from: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
                to: null,
                preAppTempAccount: applicant,
                preRelayAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
                hf,
                hb,
                b,
                n: blindedFairIntNum,
                t: token,
                l: 0, // validator's relay index is 0
            };
            data.to = nextRelayAnonymousAccount.address;
            logger.info(data, 'validator sends token to first relay');
            let relayDataHash = keccak256(JSON.stringify(data));
            relayDataHash = ensure0xPrefix(relayDataHash);
            let encryptedData = await getEncryptData(nextRelayAnonymousAccount.publicKey, data);
            let tokenHash = keccak256(token);

            // upload to blockchain
            await writeStoreData.setPre2Next(
                nextRelayAnonymousAccount.address,
                encryptedData,
                tokenHash,
                relayDataHash
            );
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
    let dataToInsert = undefined;
    if (typeof data === 'object' && data !== null && 'appTempAccount' in data) {
        finalAllAppToValidatorData.push(data); // 保存到内存
        dataToInsert = await verifyData(data, null); // verify data
        console.log('receive final data from app: ', data);
    } else {
        finalAllPreToValidatorData.push(data);
        dataToInsert = await verifyData(null, data); // verify data
        console.log('receive final data from previous relay: ', data);
    }

    console.log(dataToInsert);
    if (dataToInsert == null) {
        console.log('verify not pass');
    } else {
        // 插入数据
        await saveFinalData(dataToInsert);
        // 通知applicabnt
        let toSocketAddress = dataToInsert.appToRelayData.appTempAccount;
        let res = {
            from: 'validator',
            to: toSocketAddress,
            verify: true,
            token: dataToInsert.preToNextRelayData.t,
            chainId: dataToInsert.appToRelayData.chainIndex,
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

// hash(l+1) = hash(A(l+2), r(l+2))
export async function handleChainConfirmation(userSocket: Socket, data: AppToRelayData) {
    let appEndingAccount = data.appTempAccount,
        r = data.r;
    if (appEndingAccount == null || r == null) {
        userSocket.emit('chain confirmation result', { result: false, reason: 'data lack' });
        return;
    }
    for (let app2ValidatorData of finalAllAppToValidatorData) {
        let hash = app2ValidatorData.hb;
        if (hash == null) continue;
        let res = verifyHashBackward(appEndingAccount, r, hash, null);
        if (res) {
            // 找到hash, 上传对应关系
            let findId = await prisma.app2ValidatorData.findFirst({
                select: {
                    id: true,
                },
                where: {
                    appTempAccount: app2ValidatorData.appTempAccount,
                    appTempAccountPubkey: app2ValidatorData.appTempAccountPubkey,
                    hb: hash,
                },
                orderBy: {
                    id: 'desc',
                },
            });
            // 插入chain confirmation data
            let insert1 = await prisma.app2ValidatorData.create({
                data: {
                    ...data,
                    hashBackwardRelation: findId?.id,
                },
            });
            // 修改findId中hashbackword对应关系
            await prisma.app2ValidatorData.update({
                where: {
                    id: findId?.id,
                },
                data: {
                    hashBackwardRelation: insert1.id,
                },
            });
            userSocket.emit('chain confirmation result', { result: true });
            return;
        }
    }

    userSocket.emit('chain confirmation result', { result: false, reason: 'hash mismatch' });
}
