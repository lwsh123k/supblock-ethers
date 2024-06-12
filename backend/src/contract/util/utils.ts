import { ethers } from 'ethers';
import EthCrypto, { cipher } from 'eth-crypto';

// 计算hash, 使用keccak256, 保证数据类型与solidity中的数据类型一致
export function getHash(ni: number, ta: number, tb: number, ri: string) {
    const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256', 'uint256'],
        [ni, ta, tb, ri]
    );
    return hash;
}

export function getRandom(tA: number, tB: number) {
    // 挑选随机数ni, 0 <= ni < 100. Math.random()方法返回一个0（包括）到1（不包括）之间的随机浮点数
    let ni = Math.floor(Math.random() * 100);
    // 挑选混淆值ri, 0 <= ri < 2^256
    let ri = generateRandomBytes(32);
    // 取hash
    let hash = getHash(ni, tA, tB, ri);
    return { ni, ri, hash };
}

// 生成指定长度的不全为0随机字节数组, 并转换为16进制返回
export function generateRandomBytes(length: number) {
    let randomBytes;
    do {
        // 返回值类型为 Uint8Array
        randomBytes = ethers.utils.randomBytes(length);
    } while (!randomBytes.some((x) => x !== 0)); // 数组存在x不为0,即可退出while循环
    // 将字节数组转换为十六进制字符串
    return ethers.utils.hexlify(randomBytes);
}

// 使用对方公钥加密
// 加密: 传入对象, 将对象 -> json字符串 -> 加密对象 -> 字符串
// 返回的16进制加上0x前缀
export async function getEncryptData(publicKey: string, data: any) {
    let jsonData = JSON.stringify(data);
    let encryptedData = await EthCrypto.encryptWithPublicKey(publicKey, jsonData);
    return '0x' + cipher.stringify(encryptedData);
}
