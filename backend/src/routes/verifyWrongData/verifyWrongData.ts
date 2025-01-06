import express from 'express';
import { AppToRelayData, RelayResData } from '../../socket/types';
import {
    addHexAndMod,
    ensure0xPrefix,
    getEncryptData,
    keccak256,
    subHexAndMod,
} from '../../contract/util/utils';
import { PrismaClient } from '@prisma/client';
import { verifyHashBackward, verifyHashForward } from '../../contract/util/verifyHash';
import { chainLength, userSig, validatorAccount } from '../../socket/usersData';
import { logger } from '../../util/logger';
import {
    getAccountInfoByContract,
    getAccountInfoByInfoHash,
    getBlindedFairIntByInfoHash,
} from '../../contract/util/getOnChainData';
import { constructApplicantData, constructFinalData } from './constructApplicantData';

// app received data
export type AppReceivedData = {
    tokenhash: string | null;
    relayRealnameAccount: string | null;
    encrypedToken: string | null;
    endingAccount: string | null;
};
interface wrongDataType {
    PA: AppToRelayData & { infoHash: string };
    PAReceive: AppReceivedData;
}

const verifyWrongData = express.Router();
const prisma = new PrismaClient();
verifyWrongData.post('/verifyWrongData', async (req, res) => {
    if (!req.body.wrongData) return;
    let data = req.body.wrongData as wrongDataType[];
    console.log(data);

    // 找到在server端保存的最开始的token
    let appRealAccount = data[0].PA.from,
        chainId = data[0].PA.chainIndex;
    if (!appRealAccount || chainId == null) {
        console.log(
            `appRealAccount or chainId is empty, app realname account: ${appRealAccount}, chain id: ${chainId}`
        );
        res.json({ result: false });
        return;
    }
    let savedSig = userSig.get(appRealAccount);
    if (!savedSig) {
        console.log('can not find sig of applicant');
        res.json({ result: false });
        return;
    }
    console.log('sig token array:', savedSig.t_array);
    console.log('chain id:', chainId);

    // 检查relay 1 ~ L是否诚实, 首先验证发送给relay 1的数据
    let token = savedSig.t_array[chainId],
        lastRoundBlindedFairInt = -1,
        finalRelayRealnameAddress = validatorAccount;
    for (let i = 1; i <= chainLength; i++) {
        let infoHash = data[i].PA.infoHash,
            currentB = data[i].PA.b, // 当前轮的b
            preB = data[i - 1].PA.b, // 上一轮的b, 如果i-1 == 0,
            nextRelayRealnameAccount = data[i].PAReceive.relayRealnameAccount,
            c = data[i].PA.c,
            nextAppTempAccount = data[i].PA.appTempAccount,
            currentAppTempAccount = data[i].PA.from,
            currentHash = data[i].PA.hb,
            r = data[i].PA.r,
            nextHash = data[i + 1].PA.hb,
            nextRelayRealnameAddress = data[i].PAReceive.relayRealnameAccount;
        if (
            infoHash == null ||
            preB == null ||
            nextRelayRealnameAccount == null ||
            c == null ||
            currentAppTempAccount == null ||
            currentHash == null ||
            r == null ||
            nextHash == null ||
            nextRelayRealnameAddress == null
        ) {
            logger.error(
                { infoHash, preB, nextRelayRealnameAccount, c, currentAppTempAccount },
                'some data is lacking'
            );
            return;
        }

        // 验证反向hash, 注意temp account和r用的为i+1中的数据
        let isHashCorrect = verifyHashBackward(
            data[i + 1].PA.appTempAccount!,
            data[i + 1].PA.r!,
            currentHash,
            nextHash
        );
        if (!isHashCorrect) {
            console.log(
                `hash chain is wrong, i: ${i}, current hash: ${currentHash}, next hash: ${nextHash}`
            );
            console.log(data[i], data[i + 1]);
            res.json({ result: false });
            return;
        }

        // 检查前一轮生成的随机数为当前匿名账户
        let blindedFairIntNum = await getBlindedFairIntByInfoHash(infoHash, preB);
        let accountInfo = await getAccountInfoByContract(blindedFairIntNum);
        let selectedAddress = accountInfo.address,
            selectedPubkey = accountInfo.publicKey;
        // 检查applicant发送的wrong data存在于链上
        let { constructedData, encryptedData1, dataHash1 } = await constructApplicantData(
            chainId,
            i,
            data[i].PA,
            selectedPubkey
        );
        let cnt1 = await prisma.app2RelayEvent.findFirst({
            select: {
                transactionHash: true,
            },
            where: {
                from: currentAppTempAccount,
                relay: selectedAddress,
                dataHash: dataHash1,
                infoHash: infoHash,
            },
        });
        if (cnt1 == null) {
            res.json({ result: false });
            logger.error(
                {
                    cnt1,
                    searching: {
                        from: currentAppTempAccount,
                        relay: selectedAddress,
                        dataHash: dataHash1,
                        infoHash: infoHash,
                    },
                    PA: data[i].PA,
                },
                'not found app2Relay data in database'
            );
            return;
        }
        let relayResData: RelayResData = {
            nextRelayRealnameAccount,
        };
        let dataHash2 = keccak256(JSON.stringify(relayResData));
        let cnt2 = await prisma.relayResEvidenceEvent.findFirst({
            select: {
                pre2NextResEvidence: true,
            },
            where: {
                relayAnonymousAccount: selectedAddress,
                appTempAccount: currentAppTempAccount,
                dataHash: dataHash2,
                app2RelayResEvidence: cnt1.transactionHash,
                infoHash: infoHash,
            },
        });
        if (cnt2 == null) {
            res.json({ result: false });
            logger.error(
                {
                    cnt2,
                    searching: {
                        relayAnonymousAccount: selectedAddress,
                        appTempAccount: currentAppTempAccount,
                        dataHash: dataHash2,
                        app2RelayResEvidence: cnt1.transactionHash,
                        infoHash: infoHash,
                    },
                    PA: data[i].PA,
                    PAReceived: data[i].PAReceive,
                },
                'not found RelayRes data in database'
            );
            return;
        }

        // 对比链上数据, 第一次validator将token发送给relay 1
        let tokenHash = keccak256(token);
        // 找到pre relay的地址
        let preRelayInfo = await prisma.uploadNum.findFirst({
            where: {
                from: currentAppTempAccount,
                numHashA: infoHash,
            },
        });
        let preRelayAddress = preRelayInfo?.to;
        // 对比token
        let cnt3 = await prisma.pre2NextEvent.findFirst({
            select: {
                transactionHash: true,
            },
            where: {
                from: preRelayAddress,
                relay: selectedAddress,
                tokenHash,
            },
        });
        // 不存在 或者 伪造数据
        logger.info(
            {
                searching: {
                    from: preRelayAddress,
                    relay: selectedAddress,
                    tokenHash,
                },
                token,
            },
            'searching token'
        );
        if (cnt3 == null || cnt3.transactionHash != cnt2.pre2NextResEvidence) {
            logger.error(
                { 'relay index': lastRoundBlindedFairInt, 'relay address': preRelayAddress },
                'wrong relay info'
            );
            res.json({ result: true, index: lastRoundBlindedFairInt, address: preRelayAddress });
            return;
        }

        // 构建下一轮的token = token + c
        token = addHexAndMod(token, c);
        lastRoundBlindedFairInt = blindedFairIntNum;
        finalRelayRealnameAddress = nextRelayRealnameAddress;
    }

    // verify final data, 构造PR[L+1]
    let relayFinalData = constructFinalData(data[chainLength].PA, finalRelayRealnameAddress, token);
    let cnt4 = await prisma.pre2NextEvent.count({
        where: {
            ...relayFinalData,
        },
    });
    logger.info(
        {
            searching: {
                ...relayFinalData,
            },
        },
        'searching relay final data'
    );
    if (cnt4 == 0) {
        logger.error(
            { 'relay index': lastRoundBlindedFairInt, 'relay address': finalRelayRealnameAddress },
            'wrong relay info'
        );
        res.json({
            result: true,
            index: lastRoundBlindedFairInt,
            address: finalRelayRealnameAddress,
        });
        return;
    }
    res.json({ result: false });
});

export { verifyWrongData };
