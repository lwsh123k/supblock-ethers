import express from 'express';
import { prisma } from '../../socket/usersData';

type LastRelayType = {
    chainIndex: number;
    lastRelayAccount: string;
    lastRelayIndex: number;
    hashForward: string;
};
const findLastRelay = express.Router();
findLastRelay.post('/findLastRelay', async (req, res) => {
    if (!req.body.appEndingAccount) return;
    let appEndingAccount = req.body.appEndingAccount;
    console.log(appEndingAccount);

    // 找到ending account对应的hashbackward relationship
    let hbId = await prisma.app2ValidatorData.findMany({
        select: {
            hashBackwardRelation: true,
            chainIndex: true,
        },
        where: {
            appTempAccount: appEndingAccount,
        },
        orderBy: {
            id: 'desc',
        },
        take: 3, // 只获取3条记录
    });

    // 对hbid去重, 保证不会有重复的chainIndex(防止之前数据干扰)
    let hbIdSet = new Set();
    hbId = hbId.filter((item) => {
        if (hbIdSet.has(item.chainIndex)) {
            return false;
        } else {
            hbIdSet.add(item.chainIndex);
            return true;
        }
    });

    // 找到对应的relay real name account
    let lastRelayInfo: LastRelayType[] = new Array(3).fill({
        chainIndex: -1,
        lastRelayAccount: '',
        lastRelayIndex: -1,
    });
    for (let i = 0; i < hbId.length; i++) {
        if (hbId[i].hashBackwardRelation == null) {
            continue;
        }

        let id = hbId[i].hashBackwardRelation;
        let relayFind = await prisma.app2ValidatorData.findFirst({
            select: {
                relayFinalData: true,
            },
            where: {
                id: id!,
            },
            orderBy: {
                id: 'desc',
            },
        });
        if (
            relayFind == null ||
            relayFind.relayFinalData == null ||
            relayFind.relayFinalData.from == null
        ) {
            continue;
        }
        // 查找relay对应的文件名编号, 文件名: 0, 1, 2, 3, ...
        // 因为数据库索引从1开始，而前端需要从0开始，所以返回id-1
        let index = await prisma.supBlock.findFirst({
            select: {
                id: true,
            },
            where: {
                address: relayFind.relayFinalData.from,
            },
        });
        if (index !== null) {
            // 存入数组
            lastRelayInfo[i] = {
                chainIndex: hbId[i].chainIndex,
                lastRelayAccount: relayFind.relayFinalData.from,
                lastRelayIndex: index.id - 1,
                hashForward: relayFind.relayFinalData.hf!,
            };
        }
    }
    res.json({ lastRelayInfo });
});

export { findLastRelay };
