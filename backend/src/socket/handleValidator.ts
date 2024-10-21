import { Socket } from 'socket.io';
import { logger } from '../util/logger';
import { verifyHashForward } from '../contract/util/verifyHash';
import {
    addHexAndMod,
    getDecryptData,
    getEncryptData,
    getHash,
    keccak256,
} from '../contract/util/utils';
import { getStringHash } from '../contract/util/utils';
import { PrismaClient } from '@prisma/client';
import { writeFair, writeStoreData } from '../contract/eventListen/validatorListen';
//import { getPublicKey, getSig } from '../util/eccBlind'
import eccBlind, { addressToHashMap } from './eccBlind';
import {
    AppToRelayData,
    PreToNextRelayData,
    NumInfo,
    ToApplicantSigned,
    ValidatorSendBackSig,
} from './types';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { onlineUsers } from './users';

// validator listening applicant: chain init
let app2ValidatorData = new Map<string, AppToRelayData>();
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
        app2ValidatorData.set(from, data);
        // whether it's signed or not
        if (!addressToHashMap.has(from)) {
            const publicKey = eccBlind.getPublicKey();
            //logger.info(`generatedKey:${publicKey.Px}, ${publicKey.Py}`);
            socket.emit('validator send pubkey', publicKey);
            logger.info('validator has sent pubkey');
        } else if (addressToHashMap.has(from)) {
            const value = addressToHashMap.get(from);
            if (!value) {
                logger.error(`token hash not found for address ${from}`);
                return;
            }
            let sendBackData: Partial<ValidatorSendBackSig> = {};
            sendBackData.from = data.to!;
            sendBackData.to = data.from!;
            sendBackData.tokenHash = value.t_hashAry;
            sendBackData.sBlind = value.sBlind;
            sendBackData.chainIndex = data.chainIndex;
            // socket.emit('hash forward verify correct', sendBackData);
            socket.emit('validator send sig and hash', sendBackData);
        }
    }
}

// validator listening plugin: new page opened, send to next relay
const prisma = new PrismaClient();
export async function handleValidator2Next(socket: Socket, data: NumInfo) {
    logger.info('plugin to validator: new page opened');
    // select data and encrypt data
    let { from, to, applicant, relay, blindedFairIntNum } = data;
    let dataFromApplicant = app2ValidatorData.get(applicant);
    if (dataFromApplicant) {
        let { hf, hb, b } = dataFromApplicant;
        if (!hf || !hb || !b) throw new Error('hf or hb or b is is empty');
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
            let token = '3333333333333333333333333333333333333333333333333333333333333333';
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
                t: token,
                l: 0, // validator's relay index is 0
            };
            nextRelayData.to = nxetRelay.address;
            let encryptedData = await getEncryptData(nxetRelay.publicKey, nextRelayData);

            // upload to blockchain
            await writeStoreData.setPre2Next(nxetRelay.address, encryptedData);
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
let allAppToValidatorData: AppToRelayData[] = [],
    allPreToValidatorData: PreToNextRelayData[] = [];
export async function handleFinalData(
    userSocket: Socket,
    data: PreToNextRelayData | AppToRelayData
) {
    // save data from applicant or previous relay
    let verifyResult = undefined;
    if (typeof data === 'object' && data !== null && 'appTempAccount' in data) {
        allAppToValidatorData.push(data);
        verifyResult = await verifyData(data, null); // verify data
        console.log('receive final data from app: ', data);
    } else {
        allPreToValidatorData.push(data);
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

    for (let appToRelayData of allAppToValidatorData) {
        // 验证applicant数据来源
        if (
            isAppData &&
            (applicantData!.r != appToRelayData.r || applicantData!.hf != appToRelayData.hf)
        )
            continue;
        for (let preToNextRelayData of allPreToValidatorData) {
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
