import { ethers, utils } from 'ethers';
import { getFairIntGen, getStoreData } from './getContractInstance';
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

// listen new event through block to promise event order
export async function recordThroughBlock() {
    // contract and it's address
    const fairIntGen = getFairIntGen();
    const storeData = getStoreData();
    const fairIntGenAddress = fairIntGen.address,
        storeDataAddress = storeData.address;

    try {
        // websocket
        const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');

        // filters
        // let reqHashFilter = fairIntGen.filters.ReqHashUpload(); // hash
        // let resHashFilter = fairIntGen.filters.ResHashUpload();
        // let reqInfoFilter = fairIntGen.filters.ReqInfoUpload(); // random num
        // let resInfoFilter = fairIntGen.filters.ResInfoUpload();
        // let reqReuploadNum = fairIntGen.filters.ReqReuploadNum(); // random num reupload

        // console.log(reqHashFilter.topics, reqHashFilter.address);
        // reqHashFilter.topics = event hash
        // console.log(utils.id('ReqHashUpload(address,address,bytes32,uint256,uint256,uint256,uint256)'));

        provider.on('block', async (blockNumber) => {
            // get all tx
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
        });

        // error handle
        provider.on('error', (error: any) => {
            console.error('WebSocket Error:', error);
        });

        console.log('Block listener started. Waiting for new blocks...');
    } catch (error) {
        console.error('Failed to connect to provider');
        setTimeout(async () => {
            await reconnect();
        }, 10000);
    }
}

// 重新连接
const reconnect = async () => {
    console.log('Reconnecting...');
    await recordThroughBlock();
};
