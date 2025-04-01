import { ethers } from 'ethers';
import { getEncryptData } from './util';

export type AppToRelayData = {
    from: null | string; // pre applicant temp account, 和PreToNextRelayData中preAppTempAccount对应
    to: null | string; // relay
    appTempAccount: null | string; // 下一轮app要用的temp account
    appTempAccountPubkey: null | string;
    r: null | string;
    hf: null | string;
    hb: null | string;
    b: null | number;
    c: null | string;
    l: number; // 比PreToNextRelayData中l大一
    chainIndex: number;
};

const chainLength = 3;

export async function getApp2RelayEncryptedData(chainIndex: number, relayNumber: number) {
    let data: AppToRelayData = {
        from: null,
        to: null,
        appTempAccount: null,
        appTempAccountPubkey: null,
        r: null,
        hf: null,
        hb: null,
        b: null,
        c: null,
        l: relayNumber,
        chainIndex: chainIndex,
    };
    let randomFrom = ethers.Wallet.createRandom();
    let randomTo = ethers.Wallet.createRandom();
    let randomBytes = ethers.utils.randomBytes(32);
    let randomNumber = Math.floor(Math.random() * 1000);
    if (relayNumber === 0) {
        data.from = randomFrom.address;
        data.to = randomTo.address;
        data.r = ethers.utils.hexlify(randomBytes);
        data.hf = ethers.utils.hexlify(randomBytes);
        data.hb = ethers.utils.hexlify(randomBytes);
        data.b = randomNumber;
    } else if (relayNumber >= 1 && relayNumber <= chainLength - 1) {
        data.from = randomFrom.address;
        data.to = randomTo.address;
        data.appTempAccount = randomTo.address;
        data.appTempAccountPubkey = randomTo.publicKey;
        data.r = ethers.utils.hexlify(randomBytes);
        data.hf = ethers.utils.hexlify(randomBytes);
        data.hb = ethers.utils.hexlify(randomBytes);
        data.b = randomNumber;
        data.c = ethers.utils.hexlify(randomBytes);
    } else if (relayNumber === chainLength) {
        data.from = randomFrom.address;
        data.to = randomTo.address;
        data.appTempAccount = randomTo.address;
        data.appTempAccountPubkey = randomTo.publicKey;
        data.r = ethers.utils.hexlify(randomBytes);
        data.hf = ethers.utils.hexlify(randomBytes);
        data.hb = ethers.utils.hexlify(randomBytes);
        data.c = ethers.utils.hexlify(randomBytes);
    } else if (relayNumber === chainLength + 1) {
        data.from = randomFrom.address;
        data.to = randomTo.address;
        data.appTempAccount = randomTo.address;
        data.appTempAccountPubkey = randomTo.publicKey;
        data.r = ethers.utils.hexlify(randomBytes);
        data.hf = ethers.utils.hexlify(randomBytes);
        data.hb = ethers.utils.hexlify(randomBytes);
    } else if (relayNumber === chainLength + 2) {
        data.from = randomFrom.address;
        data.to = randomTo.address;
        data.appTempAccount = randomTo.address;
        data.appTempAccountPubkey = randomTo.publicKey;
        data.r = ethers.utils.hexlify(randomBytes);
    }

    // encrypt data
    let app2RelayEncryptedData = await getEncryptData(randomTo.publicKey, data);
    return {
        app2RelayEncryptedData,
        dataHash: ethers.utils.randomBytes(32),
        infoHash: ethers.utils.randomBytes(32),
    };
}
