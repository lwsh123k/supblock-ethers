import express from 'express';
import { AppToRelayData } from '../socket/types';
import { addHexAndMod, ensure0xPrefix, keccak256, subHexAndMod } from '../contract/util/utils';
import { PrismaClient } from '@prisma/client';
import { verifyHashForward } from '../contract/util/verifyHash';
import { userSig } from '../socket/usersData';
import { logger } from '../util/logger';

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
    console.log('sig token array:', savedSig.t_array);
    console.log('chain id:', chainId);

    // 使用真正的token计算, token + c
    let expectedToken = [savedSig.t_array[chainId]]; // relay i应该给下一个relay发送的数据
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
    console.log('expected token array:', expectedToken);

    // 使用接收到的token计算, token - c, 假设validator诚实, 验证validator给applicant发过encrypted token
    let token = data[chainLength + 1].PAReceive.encrypedToken;
    if (!token) {
        res.json({ result: false });
        return;
    }
    let calculatedTokenList = [token];
    for (let i = chainLength; i >= 1; i--) {
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
        let dataHash = ensure0xPrefix(keccak256(JSON.stringify(data[i].PA)));
        console.log(`searching applicant to relay data hash: ${dataHash}`);
        let count = await prisma.app2RelayEvent.count({
            where: {
                dataHash: dataHash,
            },
        });
        if (count === 0) {
            console.log(`data hash not exist in tx history, hash: ${dataHash}, i: ${i}`);
            console.log('applicant data:', data[i].PA);
            res.json({ result: false });
            return;
        }
        // 验证正向hash
        let preHash = data[i - 1].PA.hf;
        let isHashCorrect = verifyHashForward(appTempAccount, r, hf, preHash);
        if (!isHashCorrect) {
            console.log(`hash chain is wrong, i: ${i}, pre hash: ${preHash}, current hash: ${hf}`);
            res.json({ result: false });
            return;
        }
        // 减去c之后, 就是relay发送给下一个relay的数据
        token = subHexAndMod(token, c);
        calculatedTokenList.unshift(token);
        // console.log(`token: ${token}, i: ${i}, typeof token: ${typeof token}`);
    }
    console.log('calculate token array:', calculatedTokenList);

    // 找到错误的relay
    let wrongRelayAddress = null;
    for (let i = 1; i <= chainLength; i++) {
        console.log(
            `i: ${i}, expected token: ${expectedToken[i]}, calculated token: ${calculatedTokenList[i]}`
        );
        if (expectedToken[i] != calculatedTokenList[i]) {
            let b = data[i].PA.b;
            // 找到哪个relay对applicant做出回应
            // 1. app to relay data, 既然得到了整条token, relay一定回应了applicant
            // 2. relay res data, 根据relay响应用的anonymous account, 计算hash, 查找链上数据
            let dataHash = ensure0xPrefix(keccak256(JSON.stringify(data[i].PA)));
            let res = await prisma.app2RelayEvent.findFirst({
                where: {
                    dataHash: dataHash,
                },
                select: { relay: true },
            });
            if (!res) {
                logger.error({ dataHash }, 'cannot find the relay responding to the applicant');
            }
            wrongRelayAddress = res?.relay;
            break;
        }
    }
    if (wrongRelayAddress != null) {
        let info = await prisma.supBlock.findFirst({
            where: {
                address: wrongRelayAddress,
            },
            select: {
                id: true,
                publicKey: true,
                address: true,
            },
        });
        console.log(`wrong relay index: ${info!.id}, wrong relay address: ${info?.address}`);
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
