import { PrismaClient } from '@prisma/client';
import { logger } from '../util/logger';
import { hashToBMapping, onlineUsers } from './usersData';

export async function sendRelayInfo(
    applicant: string,
    relay: string,
    fairIntegerNumber: number,
    hashA: string
) {
    // fair integer = (blinding number + joint random number selection) % 99 + 1
    if (!hashToBMapping.has(hashA)) {
        logger.error('blinding number does not exist');
        return;
    }
    let { blindingNumber, chainId, relayId } = hashToBMapping.get(hashA)!;
    let blindedFairIntNum = ((fairIntegerNumber + blindingNumber) % 99) + 1;

    // send to relayInfo
    let relayInfoSocket = onlineUsers['relayInfo'];
    if (relayInfoSocket) {
        // 将validator改到server side, plugin将打开新页面的信息回送到server
        if (relay === '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba') relay = 'validator';
        // 找到随机数对应的relay real name address
        const prisma = new PrismaClient();
        let info = await prisma.supBlock.findFirst({
            where: {
                id: blindedFairIntNum + 1,
            },
            select: {
                id: true,
                publicKey: true,
                address: true,
            },
        });
        relayInfoSocket.emit('send relay info', {
            from: 'server',
            to: 'relayInfo',
            applicant,
            relay,
            nextRelay: info?.address,
            blindedFairIntNum: blindedFairIntNum,
            fairIntegerNumber,
            blindingNumber,
            hashOfApplicant: hashA,
            chainId,
            relayId,
        });
    } else logger.error('relayInfo not connect');
}
