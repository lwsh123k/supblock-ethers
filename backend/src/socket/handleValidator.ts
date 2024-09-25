import { Socket } from 'socket.io';
import { logger } from '../util/logger';
import { verifyHashForward } from '../contract/util/verifyHash';
import { getEncryptData } from '../contract/util/utils';
import { PrismaClient } from '@prisma/client';
import { writeFair, writeStoreData } from '../contract/eventListen/validatorListen';
import { getStoreData } from '../contract/getContractInstance';
//import { getPublicKey, getSig } from '../util/eccBlind'
import eccBlind from './eccBlind';
// applicant发送给relay的数据类型
export type AppToRelayData = {
    from: null | string;
    to: null | string;
    appTempAccount: null | string;
    r: null | string;
    hf: null | string;
    hb: null | string;
    b: null | number;
    c: null | number;
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
        let sendBackData: any = {};
        sendBackData.from = data.to!;
        sendBackData.to = data.from!;
        sendBackData.tokenHash =
            '0x3333333333333333333333333333333333333333333333333333333333333333'; // 暂时为固定值
        sendBackData.chainIndex = data.chainIndex;
        socket.emit('verify correct', sendBackData);
    }
    //发送公钥
    const publicKey = eccBlind.getPublicKey();
    logger.info(`生成的公钥：${publicKey.Px}, ${publicKey.Py}`);
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
    t: null | string; // ??????????
    l: number;
};

// validator收到plugin打开新页面的信息之后, 给下一个relay发送信息
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
        nextRelayData = {
            from: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
            to: null,
            preAppTempAccount: applicant,
            preRelayAccount: '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba',
            hf,
            hb,
            b,
            n: blindedFairIntNum,
            t: '0x3333333333333333333333333333333333333333333333333333333333333333',
            l: 0, // validator's relay index is 0
        };
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
let allAppToRelayData: AppToRelayData[] = [],
    allPreToNextRelayData: PreToNextRelayData[] = [];
export async function handleFinalData(socket: Socket, data: PreToNextRelayData | AppToRelayData) {
    // save data
    if (typeof data === 'object' && data !== null && 'appTempAccount' in data) {
        allAppToRelayData.push(data);

        console.log('receive final data from app: ', data);
    } else {
        allPreToNextRelayData.push(data);
        console.log('receive final data from app: ', data);
    }
    // verify data
    let res = verifyData();
    // send token t to applicant
    socket.emit('validator send token t', res); // for test
    if (res.verify) socket.emit('validator send token t', res);
}

function verifyData() {
    let result: { verify: Boolean; token: string; chainId: number } = {
        verify: false,
        token: '',
        chainId: -1,
    };
    for (let appToRelayData of allAppToRelayData) {
        for (let preToNextRelayData of allPreToNextRelayData) {
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
                return result;
            }
        }
    }

    return result;
}
