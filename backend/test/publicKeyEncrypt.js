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

test();
