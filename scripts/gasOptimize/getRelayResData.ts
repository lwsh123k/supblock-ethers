import { ethers, Wallet } from 'ethers';
import { ensure0xPrefix, getEncryptData, keccak256 } from './util';

export type RelayResData = {
    nextRelayRealnameAccount: string;
};
// next relay通过socket和区块链, 使用匿名账户回复pre applicant account, 要使用的实名账户
export async function getNextRelay2AppData() {
    let randomFrom = ethers.Wallet.createRandom();
    let randomTo = ethers.Wallet.createRandom();
    let randomBytes = ethers.utils.randomBytes(32);
    let randomNumber = Math.floor(Math.random() * 1000);
    let data: RelayResData = {
        nextRelayRealnameAccount: randomTo.address,
    };
    let encryptedData = await getEncryptData(randomTo.publicKey, data);
    encryptedData = ensure0xPrefix(encryptedData);

    let relayDataHash = keccak256(JSON.stringify(data));
    relayDataHash = ensure0xPrefix(relayDataHash);
    let appTxHash = ethers.utils.hexlify(randomBytes);
    let preRelayTxHash = ethers.utils.hexlify(randomBytes);
    let infoHash = ethers.utils.hexlify(randomBytes);
    return {
        preApplicantTempAccount: randomFrom.address,
        encryptedData,
        relayDataHash,
        appTxHash,
        preRelayTxHash,
        infoHash,
    };
}
