const EthCrypto = require('eth-crypto');
// 测试使用eth-crypto(eth-crypto是使用eccrypto实现的)

async function test() {
    const publicKey = EthCrypto.publicKeyByPrivateKey(
        '0x107be946709e41b7895eea9f2dacf998a0a9124acbb786f0fd1a826101581a07'
    );
    console.log(publicKey);

    // 加密
    const encrypted = await EthCrypto.encryptWithPublicKey(
        publicKey, // publicKey
        'foobar' // message
    );
    console.log(encrypted);

    // 解密
    const message = await EthCrypto.decryptWithPrivateKey(
        '0x107be946709e41b7895eea9f2dacf998a0a9124acbb786f0fd1a826101581a07', // privateKey
        encrypted
    );
    console.log(message);

    // stringify
    let str1 = EthCrypto.cipher.stringify(encrypted);
    console.log(str1);

    // de stringify
    let str2 = EthCrypto.cipher.parse(str1);
    console.log(str2);
}

// 测试对object进行加密, 解密
async function testObject() {
    const PublicKeyEncrypt = {
        // 加密: 传入对象, 将对象 -> 字符串 -> 加密对象 -> 字符串,
        async getEncryptData(publicKey, data) {
            let jsonData = JSON.stringify(data);
            let encryptedData = await EthCrypto.encryptWithPublicKey(publicKey, jsonData);
            return EthCrypto.cipher.stringify(encryptedData);
        },
        // 解密: 字符串 -> 解密对象 -> json对象 -> 对象
        async getDecryptData(privateKey, encryptedData) {
            let jsonData = await EthCrypto.decryptWithPrivateKey(
                privateKey,
                EthCrypto.cipher.parse(encryptedData)
            );
            let data = JSON.parse(jsonData);
            return data;
        },
    };

    const publicKey = EthCrypto.publicKeyByPrivateKey(
        '0x107be946709e41b7895eea9f2dacf998a0a9124acbb786f0fd1a826101581a07'
    );
    cipherText = await PublicKeyEncrypt.getEncryptData(publicKey, { a: 100 });
    console.log(cipherText);
    let text = await PublicKeyEncrypt.getDecryptData(
        '0x107be946709e41b7895eea9f2dacf998a0a9124acbb786f0fd1a826101581a07',
        cipherText
    );
    console.log(text);
}
// test();
testObject();
