import { ethers } from 'ethers';

// 提供provider, 合约读写实例
// node version18, localhost地址解析为ipv6
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');

export { provider };
