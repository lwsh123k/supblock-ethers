import { ethers } from 'ethers';
import { getFairIntGen } from './getContractInstance';
import { PrismaClient } from '@prisma/client';

// listen new event through block to promise event order
export function recordThroughBlock() {
    // 假设你已经有了合约 ABI 和地址
    const fairIntGenABI = [
        /* 这里填入 FairIntGen 合约的 ABI */
    ];
    const fairIntGenAddress = '0x...'; // FairIntGen 合约地址

    // 设置 provider（这里使用 WebSocketProvider 以支持事件监听）
    const provider = new ethers.WebSocketProvider('YOUR_WEBSOCKET_ENDPOINT');
    const prisma = new PrismaClient();
    const fairIntGen = getFairIntGen();

    // 定义多个事件过滤器
    const reqInfoFilter = fairIntGen.filters.ReqInfoUpload();
    const anotherEventFilter = fairIntGen.filters.AnotherEvent(); // 假设有另一个名为 AnotherEvent 的事件
    // 可以继续添加更多事件过滤器...

    // 设置区块监听器
    provider.on('block', async (blockNumber) => {
        console.log(`New block mined: ${blockNumber}`);

        // 获取区块
        const block = await provider.getBlock(blockNumber);

        // 获取区块中的交易
        const transactions = await Promise.all(
            block.transactions.map((txHash) => provider.getTransactionReceipt(txHash))
        );

        // 过滤出与我们的合约相关的交易
        const relevantTxs = transactions.filter((tx) => tx.to === fairIntGenAddress);

        // 处理每个相关交易
        for (const tx of relevantTxs) {
            // 为每种事件类型查询日志
            const reqInfoLogs = await fairIntGen.queryFilter(
                reqInfoFilter,
                tx.blockNumber,
                tx.blockNumber
            );
            const anotherEventLogs = await fairIntGen.queryFilter(
                anotherEventFilter,
                tx.blockNumber,
                tx.blockNumber
            );
            // 可以继续查询更多事件类型...

            // 处理 ReqInfoUpload 事件
            for (const log of reqInfoLogs) {
                const [from, to, ni, ri, tA, numHash, uploadTime, tB] = log.args;
                console.log('ReqInfoUpload event detected:', {
                    from,
                    to,
                    ni: ni.toString(),
                    ri: ri.toString(),
                    tA: tA.toString(),
                    numHash,
                    uploadTime: uploadTime.toString(),
                    tB: tB.toString(),
                });
                // 这里添加处理 ReqInfoUpload 事件的逻辑
            }

            // 处理 AnotherEvent 事件
            for (const log of anotherEventLogs) {
                // 解构 AnotherEvent 的参数，这里的参数名应该根据实际事件定义来调整
                const [param1, param2, ...rest] = log.args;
                console.log('AnotherEvent detected:', { param1, param2, ...rest });
                // 这里添加处理 AnotherEvent 的逻辑
            }

            // 可以继续添加更多事件的处理逻辑...
        }
    });

    // 错误处理
    provider.on('error', (error: any) => {
        console.error('WebSocket Error:', error);
    });

    console.log('Block listener started. Waiting for new blocks...');
}
