import {
    publicKeyByPrivateKey,
    encryptWithPublicKey,
    decryptWithPrivateKey,
    cipher,
} from 'eth-crypto';

const PublicKeyEncrypt = {
    // 加密: 传入对象, 将对象 -> 字符串 -> 加密对象 -> 字符串,
    async getEncryptData(publicKey, data) {
        cipher.stringify(data);
        let encryptedData = await encryptWithPublicKey(publicKey, data);
        return cipher.stringify(encryptedData);
    },
    // 解密: 字符串 -> 解密对象 -> json对象 -> 对象
    async getDecryptData(privateKey, encryptedData) {
        let jsonData = await decryptWithPrivateKey(privateKey, cipher.parse(encryptedData));
        let data = cipher.parse(jsonData);
        return data;
    },
};

export default PublicKeyEncrypt;
