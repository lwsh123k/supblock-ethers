import {
    publicKeyByPrivateKey,
    encryptWithPublicKey,
    decryptWithPrivateKey,
    cipher,
} from 'eth-crypto';

const PublicKeyEncrypt = {
    // 加密: 传入对象, 将对象 -> json字符串 -> 加密对象 -> 字符串
    // 返回的16进制加上0x前缀
    async getEncryptData(publicKey, data) {
        let jsonData = JSON.stringify(data);
        let encryptedData = await encryptWithPublicKey(publicKey, jsonData);
        return '0x' + cipher.stringify(encryptedData);
    },
    // 解密: 字符串 -> 解密对象 -> json对象 -> 对象
    async getDecryptData(privateKey, encryptedData) {
        // 去掉0x前缀
        let removedPrefix = encryptedData.slice(2);
        let jsonData = await decryptWithPrivateKey(privateKey, cipher.parse(removedPrefix));
        let data = JSON.parse(jsonData);
        return data;
    },
};

export default PublicKeyEncrypt;
