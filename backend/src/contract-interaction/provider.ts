import { ethers } from "ethers";

// 提供provider, 合约读写实例
const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");

export { provider };
