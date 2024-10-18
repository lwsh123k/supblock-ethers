import express from 'express';
import { AppToRelayData } from '../socket/types';
import { keccak256, subHexAndMod } from '../contract/util/utils';
import { PrismaClient } from '@prisma/client';

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
    // console.log('encrypedToken: ', token);
    for (let i = chainLength; i >= 1; i--) {
        console.log(`token: ${token}, i: ${i}, typeof token: ${typeof token}`);
        let c = data[i].PA.c,
            infoHash = data[i].PA.hf;
        if (!c || !infoHash) {
            console.log(`c or info hash is empty, c: ${c}, hash: ${infoHash}`);
            res.json({ result: false });
            return;
        }
        // find info hash
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
        token = subHexAndMod(token, c);
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
