import { ethers } from 'ethers';
import EthCrypto, { cipher } from 'eth-crypto';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex as toHex } from '@noble/hashes/utils';
import { keccak256 as keccak256Hash } from 'js-sha3';

/**
 * 用接收方公钥加密数据
 * @param publicKey 接收方公钥, 带不带0x都可以
 * @param data 传入对象, 将对象 -> json字符串 -> 加密对象 -> 字符串
 * @returns 0x + 16进制加密数据(grpc: binding number, r)
 */
export async function getEncryptData(publicKey: string, data: any) {
    // publicKey: 不带0x
    const removedPrefixpublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    let jsonData = JSON.stringify(data);
    let encryptedData = await EthCrypto.encryptWithPublicKey(removedPrefixpublicKey, jsonData);
    return '0x' + cipher.stringify(encryptedData);
}

getEncryptData(
    '0x048318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed753547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5',
    123
).then((result) => {
    console.log(result);
});
