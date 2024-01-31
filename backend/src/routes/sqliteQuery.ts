import express from 'express';
import { PrismaClient } from '@prisma/client';

const slqiteRouter = express.Router();
const prisma = new PrismaClient();

// get public key and address
slqiteRouter.post('/getAccountInfo', async (req, res) => {
    let index = req.body.index;
    console.log('searching index: ', index);
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

export { slqiteRouter };
