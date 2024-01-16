const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// 该router用于查找: index对应的address和public key
// 加密时使用实名用户的公钥, 那么这些信息可以提前存储到服务器中
// 数据库内容包括: fair integer index - account - public key
const uri = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(uri);

// get public key and address
router.post('/getAccountInfo', async (req, res) => {
    let index = req.body.index;
    console.log(index);
    let info = null;
    try {
        // optional starting in v4.7
        // await client.connect();
        const database = client.db('sup-block');
        const pkdocument = database.collection('publickey');
        let query = { i: index };
        let option = { projection: { _id: 0 } };
        info = await pkdocument.findOne(query, option);
    } finally {
        // 不要每次连接都要关闭
        // await client.close();
    }
    res.send(info);
});

module.exports = router;
