import express from 'express';
import { AppToRelayData } from '../socket/types';
import { addHexAndMod, keccak256, subHexAndMod } from '../contract/util/utils';
import { PrismaClient } from '@prisma/client';
import { verifyHashForward } from '../contract/util/verifyHash';
import { userSig } from '../socket/usersData';

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
    console.log(data);

    let chainLength = 3;

    // 计算应得的token, 与接收的错误的比较,找到哪一步出了问题
    let appRealAccount = data[0].PA.from,
        chainId = data[0].PA.chainIndex;
    if (!appRealAccount || chainId === undefined || chainId === null) {
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

    // 使用真正的token计算, token + c
    let expectedToken = [savedSig.t_array[chainId]];
    for (let i = 1; i <= chainLength; i++) {
        let c = data[i].PA.c;
        if (!c) {
            console.log('c is empty');
            res.json({ result: false });
            return;
        }
        let token = addHexAndMod(expectedToken[i - 1], c);
        expectedToken.push(token);
    }
    console.log(`real token add c: ${expectedToken}`);

    // 使用接收到的token计算, token - c
    let token = data[chainLength + 1].PAReceive.encrypedToken;
    if (!token) {
        res.json({ result: false });
        return;
    }
    let calculatedTokenList = [token];
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
        let preHash = i === 1 ? null : data[i].PA.hf;
        let isHashCorrect = verifyHashForward(appTempAccount, r, hf, preHash);
        if (!isHashCorrect) {
            console.log(`hash chain is wrong, pre hash: ${preHash}, current hash: ${hf}`);
            res.json({ result: false });
            return;
        }
        // 减去c
        token = subHexAndMod(token, c);
        calculatedTokenList.unshift(token);
    }

    // 找到错误的relay
    let wrongRelayIndex = -1;
    for (let i = 1; i <= chainLength; i++) {
        console.log(
            `i: ${i}, expected token: ${expectedToken[i]}, calculated token: ${
                calculatedTokenList[i - 1]
            }`
        );
        if (expectedToken[i] != calculatedTokenList[i]) {
            wrongRelayIndex = i - 1; // 当前错误是之前导致的
            break;
        }
    }
    if (wrongRelayIndex != -1) {
        let info = await prisma.supBlock.findUnique({
            where: {
                id: wrongRelayIndex + 1, // 编号错位
            },
            select: {
                publicKey: true,
                address: true,
            },
        });
        let relayRealnameAddress = info?.address;
        console.log(
            `wrong relay index: ${wrongRelayIndex}, wrong relay address: ${relayRealnameAddress}`
        );
    }

    // result
    let receivedHash = data[0].PAReceive.tokenhash;
    let calculatedToken = keccak256(token);
    let result = receivedHash === calculatedToken;
    console.log(
        `token(sub all c): ${token}, app received hash: ${receivedHash}, app calculated hash: ${calculatedToken}, verify result: ${result}`
    );
    res.json({ result });
});

export { verifyWrongData };
