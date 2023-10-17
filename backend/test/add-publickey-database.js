const fs = require('fs/promises');
const path = require('path');
const { MongoClient } = require('mongodb');
const EthCrypto = require('eth-crypto');

// 将index 公钥 账户从文件中读取, 存放到mongodb.
// 1-100为real name account
async function insertDocs() {
    const uri = 'mongodb://127.0.0.1:27017';
    const client = new MongoClient(uri);
    try {
        // 连接数据库
        const database = client.db('sup-block');
        const pkdocument = database.collection('publickey');

        let docs = [];
        // 文件读取, 准备数据
        for (let i = 1; i <= 100; i++) {
            let data = await fs.readFile(
                path.join('C:\\Users\\lsj\\Desktop\\account', `user account ${i}.txt`),
                'utf8'
            );

            let realNameKey = data.split('\n')[0].trim();
            let publicKey = EthCrypto.publicKeyByPrivateKey(realNameKey);
            let address = EthCrypto.publicKey.toAddress(publicKey);
            docs.push({ i: i - 1, publicKey, address });
        }
        console.log(docs.length);
        // 插入数据到数据库
        const options = { ordered: true };
        const result = await pkdocument.insertMany(docs, options);
        console.log(`${result.insertedCount} documents were inserted`);
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}

insertDocs();
/*
    {
    "_id": {
        "$oid": "652643044636f92eb77af257"
    },
    "i": 1,
    "publicKey": "8318535b54105d4a7aae60c08fc45f9687181b4fdfc625bd1a753fa7397fed753547f11ca8696646f2f3acb08e31016afac23e630c5d11f59f61fef57b0d2aa5",
    "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    }
*/
