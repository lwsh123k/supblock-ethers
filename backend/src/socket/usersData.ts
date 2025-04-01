import { Socket } from 'socket.io';
import { AppBlindUpload, AppToRelayData, PreToNextRelayData, SignedAddress } from './types';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const validatorAccount = '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba';
export const onlineUsers: { [propName: string]: Socket } = {};
export const userSig: Map<string, SignedAddress> = new Map();
export const chainNumber = 3;
export const app2ValidatorData = new Map<string, AppToRelayData[]>(); // app给relay发送的chain init数据

// user将b发送给server端, 方便后续打开新页面, relay info统计
// 存储 hash => { applicant temp address, blindlingNumber } 的映射
export const hashToBMapping = new Map<string, AppBlindUpload>();

/**
 * 保存chain init数据, 内存 + 数据库
 * @param address 申请者地址
 * @param data 数据
 * @param chainId 第几条链
 * @returns
 */
export async function saveApp2ValidatorInitData(
    address: string,
    data: AppToRelayData,
    chainId: number
) {
    // 保存到数据库
    await prisma.app2ValidatorData.create({
        data: {
            ...data,
        },
    });

    // 保存到内存
    if (!app2ValidatorData.has(address)) {
        app2ValidatorData.set(address, new Array(3).fill(undefined));
    }
    // 更新数据
    const currentData = app2ValidatorData.get(address)!;
    const position = chainId;
    if (position < 0 || position >= 3) {
        console.error(`Invalid chainId: ${chainId}. chain id must be between 1 and 3`);
        return;
    }
    currentData[position] = data;
    app2ValidatorData.set(address, currentData);
}

/**
 * 保存applicant和relay -> validator final data
 * @param data 数据
 * @returns
 */
export async function saveFinalData(data: {
    appToRelayData: AppToRelayData;
    preToNextRelayData: PreToNextRelayData;
}) {
    // 保存applicant -> relay final data
    let res1 = await prisma.app2ValidatorData.create({
        data: {
            ...data.appToRelayData,
        },
    });
    // 保存relay -> validator final data
    let res2 = await prisma.relayFinalData.create({
        data: {
            ...data.preToNextRelayData,
            app2ValidatorDataId: res1.id,
        },
    });
}

/**
 * 保存relay -> validator final data
 * @param data 数据
 * @returns
 */
export async function saveChainConfirmData(data: AppToRelayData) {
    await prisma.app2ValidatorData.create({
        data: {
            ...data,
        },
    });
}
