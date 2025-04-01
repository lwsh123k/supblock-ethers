import express from 'express';
import { PrismaClient } from '@prisma/client';

const slqiteRouter = express.Router();
const prisma = new PrismaClient();

// get public key and address
// 数据库自增索引id从1开始, 而文件索引从0开始: 1: applicant, 2-100: relay. validator不进行查询, 直接记录在前端页面中
slqiteRouter.post('/getAccountInfo', async (req, res) => {
    let index = req.body.index;
    console.log('searching public key by index ', index);
    index++; // index in database
    try {
        let info = await prisma.supBlock.findUnique({
            where: {
                id: index,
            },
            select: {
                publicKey: true,
                address: true,
            },
        });
        res.send(info);
    } catch {
    } finally {
        // 实际开发过程中不用每次都关闭连接
        // await prisma.$disconnect();
    }
});

slqiteRouter.post('/getPubkeyByAddress', async (req, res) => {
    let address = req.body.address as string;
    console.log('searching public key by address ', address);
    try {
        let info = await prisma.supBlock.findFirst({
            where: {
                address: address,
            },
            select: {
                publicKey: true,
                address: true,
            },
        });
        res.send(info);
    } catch {
    } finally {
    }
});

// get gas
interface Account {
    addressA: string;
    hashA: string;
    addressB: string;
    hashB: string;
}
slqiteRouter.post('/getGasStatistic', async (req, res) => {
    let accounts: Account[] = req.body.accounts;
    try {
        let result = [];
        for (let account of accounts) {
            // 查询 hashA 相关的所有 gas 数据
            let infoA = await prisma.uploadHash.findFirst({
                where: {
                    infoHash: account.hashA,
                },
                select: {
                    from: true,
                    to: true,
                    gas: true,
                },
            });

            // 查询 hashB 相关的所有 gas 数据
            let infoB = await prisma.uploadHash.findFirst({
                where: {
                    infoHash: account.hashB,
                },
                select: {
                    from: true,
                    to: true,
                    gas: true,
                },
            });

            // 查询与 hashA 相关的 uploadNum gas 数据
            let uploadNumA = await prisma.uploadNum.findFirst({
                where: {
                    numHashA: account.hashA,
                },
                select: {
                    gas: true,
                },
            });

            // 查询与 hashB 相关的 uploadNum gas 数据
            let uploadNumB = await prisma.uploadNum.findFirst({
                where: {
                    numHashB: account.hashB,
                },
                select: {
                    gas: true,
                },
            });

            // 查询与 hashA 相关的 reuploadNum gas 数据
            let reuploadNumA = await prisma.reuploadNum.findFirst({
                where: {
                    originalHashA: account.hashA,
                },
                select: {
                    gas: true,
                },
            });

            // 查询与 hashB 相关的 reuploadNum gas 数据
            let reuploadNumB = await prisma.reuploadNum.findFirst({
                where: {
                    originalHashB: account.hashB,
                },
                select: {
                    gas: true,
                },
            });

            result.push({
                hashA: {
                    uploadHash: infoA,
                    uploadNum: uploadNumA,
                    reuploadNum: reuploadNumA,
                },
                hashB: {
                    uploadHash: infoB,
                    uploadNum: uploadNumB,
                    reuploadNum: reuploadNumB,
                },
            });
        }
        res.status(200).json(result);
    } catch (error) {
        console.error('Error in getGasStatistic:', error);
        res.status(500).json({ error: 'Internal server error while fetching gas statistics' });
    }
});

slqiteRouter.post('/getBlindedFairIntNum', async (req, res) => {
    const realNameAddress = req.body.realNameAddress as string;
    console.log('searching blinded fair int number by address:', realNameAddress);

    try {
        const info = await prisma.supBlock.findFirst({
            where: {
                address: realNameAddress,
            },
            select: {
                id: true,
            },
        });

        // 因为数据库索引从1开始，而前端需要从0开始，所以返回id-1
        const result = info ? info.id - 1 : -1;
        res.status(200).send({ result });
    } catch (error) {
        console.error('Error getting blinded fair int number:', error);
        res.status(500).send(-1);
    }
});

export { slqiteRouter };
