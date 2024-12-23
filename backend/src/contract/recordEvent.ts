import { ethers, utils } from 'ethers';
import { getFairIntGen, getStoreData } from './util/getContractInstance';
import { PrismaClient } from '@prisma/client';
import { logger } from '../util/logger';
import { sendPluginMessage } from '../socket/handlePluginMessage';
import {
    handleApp2RelayEvent,
    handlePre2NextEvent,
    handleRelayResEvidenceEvent,
    handleReqHashUpload,
    handleReqInfoUpload,
    handleReqReuploadNum,
    handleResHashUpload,
    handleResInfoUpload,
    handleResReuploadNum,
} from './eventListen/recordEventHandler';
import { provider } from './util/provider';
import WebSocket from 'ws';

// listen new event through block to promise event order
let currentBlockNumber = 0;
export async function recordThroughBlock() {
    // contract and it's address
    const fairIntGen = getFairIntGen();
    const storeData = getStoreData();
    const fairIntGenAddress = fairIntGen.address,
        storeDataAddress = storeData.address;

    try {
        // filters
        // let reqHashFilter = fairIntGen.filters.ReqHashUpload(); // hash
        // let resHashFilter = fairIntGen.filters.ResHashUpload();
        // let reqInfoFilter = fairIntGen.filters.ReqInfoUpload(); // random num
        // let resInfoFilter = fairIntGen.filters.ResInfoUpload();
        // let reqReuploadNum = fairIntGen.filters.ReqReuploadNum(); // random num reupload

        // console.log(reqHashFilter.topics, reqHashFilter.address);
        // reqHashFilter.topics = event hash
        // console.log(utils.id('ReqHashUpload(address,address,bytes32,uint256,uint256,uint256,uint256)'));

        // 在添加新的监听器之前，先移除旧的
        provider.on('block', async (blockNumber) => {
            try {
                // get all tx
                if (currentBlockNumber >= blockNumber) return;
                currentBlockNumber = blockNumber;
                console.log('current block number:', blockNumber);
                const block = await provider.getBlock(blockNumber);
                const transactions = await Promise.all(
                    block.transactions.map((txHash) => provider.getTransactionReceipt(txHash))
                );

                // 过滤合约地址
                const relevantTxs = transactions.filter(
                    (tx) => tx.to === fairIntGenAddress || tx.to === storeDataAddress
                );
                // console.log(blockNumber, relevantTxs.length);

                // relevant tx
                for (const tx of relevantTxs) {
                    for (const log of tx.logs)
                        try {
                            let parsedLog;
                            if (tx.to === fairIntGenAddress)
                                parsedLog = fairIntGen.interface.parseLog(log);
                            else if (tx.to === storeDataAddress)
                                parsedLog = storeData.interface.parseLog(log);
                            else {
                                console.log(`can't parse log`);
                                return;
                            }
                            // handle different event
                            switch (parsedLog.name) {
                                case 'ReqHashUpload': {
                                    await handleReqHashUpload(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                case 'ResHashUpload': {
                                    await handleResHashUpload(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                case 'ReqInfoUpload': {
                                    await handleReqInfoUpload(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                case 'ResInfoUpload': {
                                    await handleResInfoUpload(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                case 'ReqReuploadNum': {
                                    await handleReqReuploadNum(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                case 'ResReuploadNum': {
                                    await handleResReuploadNum(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                case 'App2RelayEvent': {
                                    console.log('App2RelayEvent');
                                    await handleApp2RelayEvent(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                case 'Pre2NextEvent': {
                                    await handlePre2NextEvent(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                case 'RelayResEvidenceEvent': {
                                    await handleRelayResEvidenceEvent(
                                        parsedLog.args,
                                        tx.blockNumber,
                                        tx.gasUsed
                                    );
                                    break;
                                }
                                default:
                                    console.log('Unknown event:', parsedLog.name);
                            }
                        } catch (error) {
                            console.log('Failed to parse log:', error);
                        }
                }
            } catch (error) {
                console.log('error processing block:', blockNumber, error);
            }
        });

        // error handle
        provider.on('error', (error: any) => {
            console.error('WebSocket Error:', error);
        });

        console.log('Block listener started. Waiting for new blocks...');
    } catch (error) {
        logger.error('failed to record block');
        setTimeout(async () => {
            await reconnect();
        }, 10000);
    }
}

// 重新连接
const reconnect = async () => {
    logger.warn('reconnecting...');
    provider.removeAllListeners();
    await recordThroughBlock();
};

// async function checkProviderStatus(provider: ethers.providers.WebSocketProvider) {
//     try {
//         // 获取底层的 WebSocket 连接
//         const ws = (provider as any)._websocket;
//         ws.ping();
//         if (!ws || ws.readyState === WebSocket.CLOSED) {
//             return { connected: false, status: 'CLOSED' };
//         }

//         if (ws.readyState === WebSocket.CONNECTING) {
//             return { connected: false, status: 'CONNECTING' };
//         }

//         if (ws.readyState === WebSocket.CLOSING) {
//             return { connected: false, status: 'CLOSING' };
//         }

//         // 再验证一下实际连接
//         const blockNumber = await provider.getBlockNumber();
//         return { connected: true, status: 'OPEN', blockNumber };
//     } catch (error) {
//         return { connected: false, status: 'ERROR', error };
//     }
// }

// async function monitorConnection() {
//     const status = await checkProviderStatus(provider);
//     console.log(status);
//     if (!status.connected) {
//         console.log(`Provider disconnected. Status: ${status.status}`);
//         // 执行重连逻辑
//         await reconnect();
//     }
// }

// // 定期检查连接状态
// setInterval(monitorConnection, 60000);
