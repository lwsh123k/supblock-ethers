import { getFairIntGen, getStoreData } from '../util/getContractInstance';
import 'dotenv/config';
import { provider } from '../util/provider';
import { Wallet } from 'ethers';
import { getRandom, getHash } from '../util/utils';
import { logger } from '../../util/logger';

let applicantIndexMap = new Map<string, number>(); // maybe error

// 创建合约实例
export const fairIntGen = getFairIntGen();
export const readOnlyStoreData = getStoreData();
const validatorKey = process.env.VALIDATOR_WALLET;
export const writeFair = fairIntGen.connect(new Wallet(validatorKey as string, provider));
export const writeStoreData = readOnlyStoreData.connect(
    new Wallet(validatorKey as string, provider)
);

// validator listen hash, then upload hash and random num sequentially
export async function validatorListen(
    myAddress: string = '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba'
) {
    // validator监听applicant hash上传, 之后一次性上传hash, 随机数
    let hashFilter = fairIntGen.filters.ReqHashUpload(null, myAddress);
    fairIntGen.on(hashFilter, async (from, to, infoHash, tA, tB, uploadTime, index) => {
        applicantIndexMap.set(from, index.toNumber());
        // logger.info('validator event listen: hash upload from applicant')
        // console.log('hash upload from applicant', from, to, infoHash, tA, tB, uploadTime, index);

        // upload hash, then upload random num
        try {
            let { ni, ri, hash } = getRandom(tA.toNumber(), tB.toNumber());
            await writeFair.setResHash(from, hash);
            logger.info({ ni, ri, hash }, 'validator upload hash success');
            // await new Promise((resolve) => setTimeout(resolve, 1500));
            await writeFair.setResInfo(from, ni, ri);
            logger.info('validator upload random num success');
        } catch (error) {
            logger.info(error, 'error happens when upload random hasn and num');
        }
    });

    // validator监听applicant random上传, 判断是否重传
    let filter = fairIntGen.filters.ReqInfoUpload(null, myAddress);
    fairIntGen.on(filter, async (from, to, ni, ri, tA, hashA, uploadTime, tB) => {
        // verify random num, 假设validator一定会上传正确的随机数
        try {
            let res = getHash(ni.toNumber(), tA.toNumber(), tB.toNumber(), ri.toString());
            if (res !== hashA) {
                let { ni, ri, hash } = getRandom(tA.toNumber(), tB.toNumber());
                let index = applicantIndexMap.get(from);
                if (index) await writeFair.reuploadNum(from, index, 1, ni, ri);
                logger.info({ newNi: ni, newRi: ri }, 'validator reupload random num success');
            }
        } catch (error) {
            logger.info(error, 'error happens when upload random hasn and num');
        }
    });

    // 多行注释: alt + shift + a
    /* // 监听StroreData合约: applicant -> relay
    // 此处的applicant是和当前relay对应的temp account
    const storeData = await getStoreData();
    let app2Relayfilter = storeData.filters.App2RelayEvent(null, null, myAddress);
    storeData.on(app2Relayfilter, async (preApplicantTemp, preRelay, relay, data, dataIndex) => {
        console.log('监听到app to next relay消息');
        // 给下一个relay发送什么? 发送pre applicant发送来的数据
        // decode and save. 解码的数据中包含applicant下次要用的账号
        let decodeData: AppToRelayData = await getDecryptData(
            accountInfo.realNameAccount.key,
            data
        );
        console.log(decodeData);

        // 验证数据是否符合要求
        // next relay通过socket使用匿名账户回复applicant
        sendNextRelay2AppData(preApplicantTemp);
    });

    // 监听StroreData合约: pre relay -> next relay信息
    let pre2Nextfilter = storeData.filters.Pre2NextEvent(null, myAddress);
    storeData.on(pre2Nextfilter, async (preRelay, relay, data, dataIndex) => {
        console.log('监听到pre relay to next relay消息, data: ');
        // 收到的数据中包含pre applicant temp account
        let decodeData: AppToRelayData = await getDecryptData(
            accountInfo.realNameAccount.key,
            data
        );
        console.log(decodeData);
        // 当下一个relay给applicant回复使用的匿名账户
    }); */
}
