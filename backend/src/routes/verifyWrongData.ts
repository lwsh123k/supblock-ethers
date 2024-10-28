import express from 'express';
import { AppToRelayData } from '../socket/types';
import { keccak256, subHexAndMod } from '../contract/util/utils';
import { PrismaClient } from '@prisma/client';
import { verifyHashForward } from '../contract/util/verifyHash';
import { addressToHashMap } from '../socket/eccBlind';

// app received data
export type AppReceivedData = {
    tokenhash: string | null;
    relayTempAccount: string | null;
    encrypedToken: string | null;
    endingAccount: string | null;
};
interface wrongDataType {
    PA: AppToRelayData;
    PAReceive: AppReceivedData;
}

const verifyWrongData = express.Router();
const prisma = new PrismaClient();
verifyWrongData.post('/verifyWrongData', async (req, res) => {
    if (!req.body.wrongData) return;
    let data = req.body.wrongData as wrongDataType[];
    // console.log(data);

    let chainLength = 3,
        token = data[chainLength + 1].PAReceive.encrypedToken;
    if (!token) {
        res.json({ result: false });
        return;
    }

    // 计算应得的token, 与接受的错误的比较,找到哪一步出了问题
    let appRealAccount = data[0].PA.from,
        chainId = data[0].PA.chainIndex;
    if (!appRealAccount || !chainId) {
        console.log('appRealAccount or chainId is empty');
        res.json({ result: false });
        return;
    }
    let savedSig = addressToHashMap.get(appRealAccount);
    if (!savedSig) {
        console.log('can not find sig of applicant');
        res.json({ result: false });
        return;
    }
    let expectedToken = [savedSig.t_hashAry[chainId]];
    for (let i = 1; i <= chainLength; i++) {
        let c = data[i].PA.c;
        if (!c) {
            console.log('c is empty');
            res.json({ result: false });
            return;
        }
        token = subHexAndMod(expectedToken[i - 1], c);
        expectedToken.push(token);
    }
    //
    // console.log('encrypedToken: ', token);
    let preHash = null,
        calculatedTokenList = [];
    for (let i = chainLength; i >= 1; i--) {
        console.log(`token: ${token}, i: ${i}, typeof token: ${typeof token}`);
        let c = data[i].PA.c,
            infoHash = data[i].PA.hf,
            appTempAccount = data[i].PA.appTempAccount,
            r = data[i].PA.r,
            hf = data[i].PA.hf;
        if (!c || !infoHash || !appTempAccount || !r || !hf) {
            console.log(
                `message missing, c: ${c}, hash: ${infoHash}, appTempAccount: ${appTempAccount}, r: ${r}, hf: ${hf}`
            );
            res.json({ result: false });
            return;
        }
        // hash存在于链上
        let count = await prisma.uploadHash.count({
            where: {
                infoHash: infoHash,
            },
        });
        if (count === 0) {
            console.log(`info hash not exist in tx history, hash: ${infoHash}`);
            res.json({ result: false });
            return;
        }
        // 验证正向hash
        let isHashCorrect = verifyHashForward(appTempAccount, r, hf, preHash);
        if (!isHashCorrect) {
            console.log(`hash chain is wrong, hash forward: ${hf}`);
            res.json({ result: false });
            return;
        }
        preHash = hf;
        // 减去c
        token = subHexAndMod(token, c);
        if (token !== expectedToken[i]) {
            console.log(`wrong relay index ${0}`);
            // 通过链上hash找到relay的回应
        }
    }

    // result
    let receivedHash = data[0].PAReceive.tokenhash;
    let calculatedToken = keccak256(token);
    let result = receivedHash === calculatedToken;
    console.log(
        `token(sub all c): ${token}, hash received: ${receivedHash}, hash calculated: ${calculatedToken}, verify result: ${result}`
    );
    res.json({ result });
});

export { verifyWrongData };
