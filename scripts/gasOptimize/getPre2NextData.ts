import { ethers } from 'ethers';
import { getEncryptData, keccak256 } from './util';

export async function getPre2NextEncryptedData() {
    let randomFrom = ethers.Wallet.createRandom();
    let randomTo = ethers.Wallet.createRandom();
    let randomBytes = ethers.utils.randomBytes(32);
    let randomNumber = Math.floor(Math.random() * 1000);
    let processedData = {
        from: randomFrom.address,
        to: randomTo.address,
        preAppTempAccount: randomFrom.address,
        preRelayAccount: randomTo.address,
        hf: ethers.utils.hexlify(randomBytes),
        hb: ethers.utils.hexlify(randomBytes),
        b: randomNumber,
        n: randomNumber,
        t: ethers.utils.hexlify(randomBytes),
        l: randomNumber,
    };
    // encrypt data
    let encryptedPre2NextData = await getEncryptData(randomTo.publicKey, processedData);
    let pre2NextDataHash = keccak256(JSON.stringify(processedData));
    let tokenHash = keccak256(ethers.utils.hexlify(randomBytes));
    return { encryptedPre2NextData, pre2NextDataHash, tokenHash };
}
