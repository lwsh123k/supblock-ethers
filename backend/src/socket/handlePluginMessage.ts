import { logger } from '../util/logger';
import { AppBlindUpload } from './types';
import { hashToBMapping, onlineUsers } from './usersData';

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
    // console.log(typeof hashA);
    // server会检测applicant和relay上传随机数, 会调用2次sendPluginMessage, 避免同一页面打开两次
    if (hasOpened.has(hashA)) return;
    hasOpened.set(hashA, true);

    // fair integer = (blinding number + joint random number selection) % 99 + 1
    let blindingNumber;
    if (!hashToBMapping.has(hashA)) {
        logger.error({ hashA }, 'blinding number does not exist');
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
        logger.info(
            {
                applicant,
                relay,
                blindedFairIntNum,
                fairIntegerNumber,
                blindingNumber,
                hashOfApplicant: hashA,
            },
            'fair integer has been selected, sending to extension'
        );
    } else logger.error('plugin not connect');
}

// applicant将b告诉extension
export function handleAppBlindUpload(data: AppBlindUpload) {
    let { blindingNumber, tempAccount, relayAccount, hash, chainId, relayId } = data;
    hashToBMapping.set(hash, {
        hash,
        blindingNumber,
        tempAccount,
        relayAccount,
        chainId,
        relayId,
    });
    // console.log(typeof hash);
    // console.log(hashToBMapping.get(hash));
    logger.info(hashToBMapping.get(hash), 'client upload b when uploading app hash');
}
