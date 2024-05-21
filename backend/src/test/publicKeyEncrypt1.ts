import crypto from 'crypto';
import fs from 'fs';

// 生成密钥对并保存到文件
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
    },
});

fs.writeFileSync('public_key.pem', publicKey);
fs.writeFileSync('private_key.pem', privateKey);

console.log('公钥和私钥已生成并保存到文件');

// 从文件读取公钥
const publicKeyFromFile = fs.readFileSync('public_key.pem', 'utf8');

// 要加密的消息
const message = '这是一个秘密消息';

// 使用公钥加密消息
const encryptedMessage = crypto.publicEncrypt(publicKeyFromFile, Buffer.from(message));
console.log('加密后的消息:', encryptedMessage.toString('base64'));

// 从文件读取私钥
const privateKeyFromFile = fs.readFileSync('private_key.pem', 'utf8');

// 使用私钥解密消息
const decryptedMessage = crypto.privateDecrypt(privateKeyFromFile, encryptedMessage);
console.log('解密后的消息:', decryptedMessage.toString('utf8'));
