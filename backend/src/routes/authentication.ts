import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const authentication = express.Router();
const authString: Map<string, string> = new Map(); // 随机认证字符串, 将address和random string保存到mapping中

// 生成认证字符串
authentication.post('/getAuthString', async (req, res) => {
    if (!req.body.address) return;
    let address = req.body.address;
    if (!authString.has(address)) {
        // 32位16进制字符串, 如: f83e2ead-1aac-4439-8a6e-7f29db8c916d
        let randomUUID = uuidv4();
        authString.set(address, randomUUID);
    }
    res.json({ message: authString.get(address) });
});

export { authentication, authString };
