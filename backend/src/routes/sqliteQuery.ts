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
// slqiteRouter.post('/getGasStatistic', async (req, res) => {
//     console.log(11);
//     let accounts: Account[] = req.body.accounts;
//     try {
//         let result = [];
//         for (let account of accounts) {
//             let infoA = await prisma.uploadHash.findUnique({
//                 where: {
//                     infoHash: account.hashA,
//                 },
//                 select: {
//                     from: true,
//                     to: true,
//                     gas: true,
//                     uploadNum: {
//                         select: {
//                             gas: true,
//                         },
//                     },
//                     reuploadNum: {
//                         select: {
//                             gas: true,
//                         },
//                     },
//                 },
//             });

//             let infoB = await prisma.uploadHash.findUnique({
//                 where: {
//                     infoHash: account.hashB,
//                 },
//                 select: {
//                     from: true,
//                     to: true,
//                     gas: true,
//                     uploadNum: {
//                         select: {
//                             gas: true,
//                         },
//                     },
//                     reuploadNum: {
//                         select: {
//                             gas: true,
//                         },
//                     },
//                 },
//             });

//             result.push([infoA, infoB]);
//         }
//         res.send(result);
//     } catch {
//     } finally {
//         // 实际开发过程中不用每次都关闭连接
//         // await prisma.$disconnect();
//     }
// });

export { slqiteRouter };
