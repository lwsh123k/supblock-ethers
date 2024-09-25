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
import { PrismaClient } from '@prisma/client';
import { writeFair, writeStoreData } from '../contract/eventListen/validatorListen';
import { getStoreData } from '../contract/getContractInstance';

// applicant to relay: data type
export type AppToRelayData = {
    from: null | string;
    to: null | string;
    appTempAccount: null | string;
    r: null | string;
    hf: null | string;
    hb: null | string;
    b: null | number;
    c: null | string;
    l: number;
    chainIndex: number;
    lastUserRelay?: boolean;
};

// validator send back
export type ValidatorSendBackInit = {
    from: string;
    to: string;
    chainIndex: string;
    tokenHash: string;
};
let app2ValidatorData = new Map<string, AppToRelayData>();
let validatorSendBackData = new Map<string, ValidatorSendBackInit>();

// validator listening applicant: chain init
export function handleChainInit(socket: Socket, data: AppToRelayData) {
    logger.info('applicant to validator: initialization data');
    // verify data
    let { from, to, r, hf, hb, b, c, chainIndex } = data;
    if (from === null || r === null || hf === null)
        logger.error('applicant to validator: initialization data, data lack error');
    let result = verifyHashForward(from!, r!, hf!, null);

    // if right, save and send back to applicant
    if (result) {
        if (from) app2ValidatorData.set(from, data); // save data from applicant
        let token = '0x3333333333333333333333333333333333333333333333333333333333333333';
        let sendBackData: any = {};
        sendBackData.from = data.to!;
        sendBackData.to = data.from!;
        sendBackData.tokenHash = keccak256(token); // 暂时为固定值
        sendBackData.chainIndex = data.chainIndex;
        socket.emit('verify correct', sendBackData);
    }
}

interface NumInfo {
    from: string; // always is 'server'
    to: string; // always is 'plugin'
    applicant: string;
    relay: string;
    blindedFairIntNum: number; // b + fair integer
    fairIntegerNumber: number;
    blindingNumber: number; // b
    url: string;
    hashOfApplicant: string;
}
// current relay -> next relay
export type PreToNextRelayData = {
    from: null | string; // current relay anonymous account
    to: null | string; // relay
    preAppTempAccount: null | string; // 和pre relay对应的pre app temp account, 和AppToRelayData中from对应
    preRelayAccount: null | string; // pre relay anonymous account = from
    hf: null | string;
    hb: null | string;
    b: null | number;
    n: null | number;
    t: null | string;
    l: number;
};

// validator listening plugin: new page opened, send to next relay
const prisma = new PrismaClient();
export async function handleValidator2Next(socket: Socket, data: NumInfo) {
    logger.info('plugin to validator: new page opened');
    // select data and encrypt data
    let { from, to, applicant, relay, blindedFairIntNum } = data;
    let dataFromApplicant = app2ValidatorData.get(applicant);
    // find t corresponding to applicant address
    // let token = app2ValidatorData.get()
    let nextRelayData: PreToNextRelayData;
    if (dataFromApplicant) {
        let { hf, hb, b } = dataFromApplicant;
        if (!hf || !hb || !b) throw new Error('hf or hb or b is is empty');
        try {
            // find index of relay real name address
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
            // use the corresponding pubkey to encrypt t with adding c
            let token = '0x3333333333333333333333333333333333333333333333333333333333333333';
            let encryptedToken = await getEncryptData(nxetRelay.publicKey, token);
            nextRelayData = {
                from: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
                to: null,
                preAppTempAccount: applicant,
                preRelayAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
                hf,
                hb,
                b,
                n: blindedFairIntNum,
                t: encryptedToken,
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
export async function handleFinalData(socket: Socket, data: PreToNextRelayData | AppToRelayData) {
    // save data
    if (typeof data === 'object' && data !== null && 'appTempAccount' in data) {
        allAppToValidatorData.push(data);
        console.log('receive final data from app: ', data);
    } else {
        allPreToValidatorData.push(data);
        console.log('receive final data from previous relay: ', data);
    }
    // verify data
    let res = await verifyData();
    console.log('verify result: ', res);
    // decode data
    try {
        if (res.verify === false) throw new Error('verify not pass');
        if (res.token === '') throw new Error('token is empty');
        // better way is reading from .env
        let validatorPrivateKey =
            '0x31f01500fb999fe79d19fe9f22d67aad4968a97fa15c1d22281c96357df5feaa';
        let token = await getDecryptData(validatorPrivateKey, res.token);
        let c = res.c;
        let tokenAddc = addHexAndMod(token, c);
        res.token = tokenAddc;
    } catch (error) {
        console.log(error);
    }

    // send token t to applicant
    socket.emit('validator send token t', res); // for test
    if (res.verify) socket.emit('validator send token t', res);
}

async function verifyData() {
    let result: { verify: Boolean; token: string; chainId: number; c: string } = {
        verify: false,
        token: '',
        chainId: -1,
        c: '',
    };
    for (let appToRelayData of allAppToValidatorData) {
        for (let preToNextRelayData of allPreToValidatorData) {
            // 验证正向hash
            let hf = appToRelayData.hf,
                preHf = preToNextRelayData.hf,
                r = appToRelayData.r,
                appTempAccount = appToRelayData.appTempAccount,
                token = preToNextRelayData.t;
            if (!hf || !preHf || !r || !appTempAccount || !token) return result;
            let res1 = verifyHashForward(appTempAccount, r, hf, preHf);
            console.log('data to next relay verification result: ', res1);
            if (res1) {
                result.verify = true;
                result.token = token;
                result.chainId = appToRelayData.chainIndex;
                result.c = appToRelayData.c!;
                return result;
            }
        }
    }

    return result;
}
