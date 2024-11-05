import { logger } from '../util/logger';
import { onlineUsers } from './usersData';

// 存储r => { applicant temp address, blindlingNumber } 的映射
export const hashToBMapping = new Map<
    string,
    { blindingNumber: number; tempAccount: string; relayAccount: string }
>();

// 将双方上传随机数完成的消息发送给插件
// 监听随机数上传, 并将信息告诉extension, extension打开新页面, 告诉applicant和relay可以发送信息了
// 避免extension重复打开页面
let hasOpened = new Map<string, boolean>();
export function sendPluginMessage(
    applicant: string,
    relay: string,
    fairIntegerNumber: number,
    hashA: string
) {
    console.log(typeof hashA);
    // server会检测applicant和relay上传随机数, 会调用2次sendPluginMessage, 避免同一页面打开两次
    if (hasOpened.has(hashA)) return;
    hasOpened.set(hashA, true);

    // fair integer = (blinding number + joint random number selection) % 99 + 1
    let blindingNumber;
    if (!hashToBMapping.has(hashA)) {
        throw new Error('blinding number does not exist');
    } else blindingNumber = hashToBMapping.get(hashA)?.blindingNumber!;
    let blindedFairIntNum = ((fairIntegerNumber + blindingNumber) % 99) + 1;

    // send to plugin
    let pluginSocket = onlineUsers['plugin'];
    // 请求打开新页面, partner是指: 响应者, 此时请求者和响应者都需要给next relay发送消息.
    if (pluginSocket) {
        // 将validator改到server side, plugin将打开新页面的信息回送到server
        if (relay === '0x863218e6ADad41bC3c2cb4463E26B625564ea3Ba') relay = 'validator';
        pluginSocket.emit('open a new tab', {
            from: 'server',
            to: 'plugin',
            applicant,
            relay,
            blindedFairIntNum: blindedFairIntNum,
            fairIntegerNumber,
            blindingNumber,
            hashOfApplicant: hashA,
            url: 'http://localhost:5173/bridge',
        });
    } else logger.error('plugin not connect');
}

export function handleAppBlindUpload(data: AppBlindUpload) {
    let { blindingNumber, tempAccount, relayAccount, hash } = data;
    hashToBMapping.set(hash, {
        blindingNumber,
        tempAccount,
        relayAccount,
    });
    console.log(typeof hash);
    console.log(hashToBMapping.get(hash));
    logger.info(hashToBMapping.get(hash), 'client upload b when uploading app hash');
}

export type AppBlindUpload = {
    blindingNumber: number;
    tempAccount: string;
    relayAccount: string;
    hash: string;
};
