import { Socket } from 'socket.io';
import { logger } from '../util/logger';
import { verifyHashForward } from '../contract/util/verifyHash';
import { getEncryptData } from '../contract/util/utils';
import { PrismaClient } from '@prisma/client';
import { writeFair, writeStoreData } from '../contract/eventListen/validatorListen';
import { getStoreData } from '../contract/getContractInstance';

// applicant发送给relay的数据类型
export type AppToRelayData = {
    from: null | string;
    to: null | string;
    r: null | string;
    hf: null | string;
    hb: null | string;
    b: null | number;
    c: null | number;
    chainIndex: number;
};

let app2ValidatorData = new Map<string, AppToRelayData>();
export function handleChainInit(socket: Socket, data: AppToRelayData) {
    logger.info('applicant to validator: initialization data');
    // verify data
    let { from, to, r, hf, hb, b, c } = data;
    if (from === null || r === null || hf === null)
        logger.error('applicant to validator: initialization data, data lack error');
    let result = verifyHashForward(from!, r!, hf!, null);

    // if right, save and send back to applicant
    if (result) {
        if (from) app2ValidatorData.set(from, data); // save data from applicant
        let sendBackData: any = {};
        sendBackData.from = data.to;
        sendBackData.to = data.from;
        sendBackData.tokenHash =
            '0x3333333333333333333333333333333333333333333333333333333333333333'; // 暂时为固定值
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
    t: null | string; // ??????????
};

// validator收到plugin打开新页面的信息之后, 给下一个relay发送信息
const prisma = new PrismaClient();
export async function handleValidator2Next(socket: Socket, data: NumInfo) {
    logger.info('plugin to validator: new page opened');
    // select data and encrypt data
    let { from, to, applicant, relay, blindedFairIntNum } = data;
    let dataFromApplicant = app2ValidatorData.get(applicant);
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
            t: null,
        };
        try {
            // index -> relay real name address
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
