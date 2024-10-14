import express from 'express';
import { AppToRelayData } from '../socket/types';
import { keccak256, subHexAndMod } from '../contract/util/utils';

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
    console.log('encrypedToken: ', token);
    for (let i = chainLength; i >= 1; i--) {
        console.log(`token: ${token}, i: ${i}, typeof token: ${typeof token}`);
        let c = data[i].PA.c;
        if (!c) {
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
