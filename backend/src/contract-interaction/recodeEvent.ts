import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 使用Infura，替换YOUR_INFURA_ID与合约信息
const provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/YOUR_INFURA_ID");
const contractAddress = 'YOUR_CONTRACT_ADDRESS';
const contractABI = [/* Contract ABI */];

const contract = new ethers.Contract(contractAddress, contractABI, provider);

async function listenForEvents() {
    contract.on("YourEventName", async (from, to, amount, event) => {
        // 事件数据处理
        console.log({ from, to, amount, event });

        // 存储事件到数据库
        const savedEvent = await prisma.event.create({
            data: {
                transactionHash: event.transactionHash,
                contractAddress: contractAddress,
                eventName: "YourEventName",
                eventData: JSON.stringify({ from, to, amount }), // 根据需要自定义
                timeStamp: (await event.getBlock()).timestamp.toString(),
                blockNumber: event.blockNumber,
            },
        });

        console.log("Event saved:", savedEvent);
    });
}

listenForEvents().catch(console.error);
