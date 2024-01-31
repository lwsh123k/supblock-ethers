const fs = require('fs/promises');
const path = require('path');
import { PrismaClient } from '@prisma/client';
const EthCrypto = require('eth-crypto');

// 将index 公钥 账户从文件中读取, 存放到sqlite
// 1-100为real name account
async function insertDocs() {
    const prisma = new PrismaClient();
    try {
        // 文件读取, 上传到数据库
        for (let i = 0; i < 100; i++) {
            let data = await fs.readFile(
                path.join('C:\\Users\\lsj\\Desktop\\account', `user account ${i}.txt`),
                'utf8'
            );
            let realNameKey = data.split('\n')[0].trim();
            let publicKey = EthCrypto.publicKeyByPrivateKey(realNameKey);
            let address = EthCrypto.publicKey.toAddress(publicKey);

            // 检查是否存在重复数据
            const exists = await prisma.supBlock.findFirst({
                where: {
                    publicKey: publicKey,
                },
            });

            // 如果不存在，则插入新数据
            if (!exists) {
                await prisma.supBlock.create({
                    data: { publicKey, address },
                });
            }
        }
    } finally {
        await prisma.$disconnect();
    }
}

insertDocs();
