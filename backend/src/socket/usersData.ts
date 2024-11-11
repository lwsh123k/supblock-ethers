import { Socket } from 'socket.io';
import { AppToRelayData, SignedAddress } from './types';

export const onlineUsers: { [propName: string]: Socket } = {};
export const userSig: Map<string, SignedAddress> = new Map();
export const chainNumber = 3;
export const app2ValidatorData = new Map<string, AppToRelayData[]>(); // app给relay发送的chain init数据

export function addApp2ValidatorData(address: string, data: AppToRelayData, chainId: number) {
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
