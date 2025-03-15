import { ethers } from 'ethers';
// import { cipher, decryptWithPrivateKey, encryptWithPublicKey } from 'eth-crypto';
import EthCrypto, { cipher } from 'eth-crypto';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex as toHex, randomBytes } from '@noble/hashes/utils';
import { keccak256 as keccak256Hash } from 'js-sha3';

/**
 * 计算hash, 使用keccak256, 保证数据类型与solidity中的数据类型一致
 * @param ni
 * @param ta
 * @param tb
 * @param ri
 * @returns 返回带0x前缀的hash
 */
export function getHash(ni: number, ta: number, tb: number, ri: string) {
    const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256', 'uint256'],
        [ni, ta, tb, ri]
    );
    return hash;
}

// 计算签名
export async function getSign(data: any, privateKey: string) {
    let wallet = new ethers.Wallet(privateKey);
    let signedData = await wallet.signMessage(data);
    return signedData;
}

// 计算地址
export function getAddress(privateKey: string) {
    let address = ethers.utils.computeAddress(privateKey);
    return address;
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

export function getRandom(tA: number, tB: number) {
    // 挑选随机数ni, 0 <= ni < 100. Math.random()方法返回一个0（包括）到1（不包括）之间的随机浮点数
    let ni = Math.floor(Math.random() * 100);
    // 挑选混淆值ri, 0 <= ri < 2^256
    let ri = generateRandomBytes(32);
    // 取hash
    let hash = getHash(ni, tA, tB, ri);
    return { ni, ri, hash };
}

/**
 * 用接收方公钥加密数据
 * @param publicKey 接收方公钥
 * @param data 传入对象, 将对象 -> json字符串 -> 加密对象 -> 字符串
 * @returns 0x + 16进制加密数据(grpc: binding number, r)
 */
export async function getEncryptData(publicKey: string, data: any) {
    // publicKey: 不带0x
    const removedPrefixpublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    let jsonData = JSON.stringify(data);
    let encryptedData = await EthCrypto.encryptWithPublicKey(removedPrefixpublicKey, jsonData);
    return '0x' + cipher.stringify(encryptedData);
}

/**
 * 使用私钥解密: 字符串 -> 解密对象 -> json对象 -> 对象
 * @param privateKey 私钥
 * @param encryptedData 要解密的数据, 带不带0x前缀都可以
 * @returns 原始数据
 */
export async function getDecryptData(privateKey: string, encryptedData: string) {
    // privatekay: 带0x前缀, encryptedData: 不带0x前缀
    privateKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
    const removedPrefixData = encryptedData.startsWith('0x')
        ? encryptedData.slice(2)
        : encryptedData; // 去掉0x前缀
    // console.log(privateKey, removedPrefixData, cipher.parse(removedPrefixData));
    let jsonData = await EthCrypto.decryptWithPrivateKey(
        privateKey,
        cipher.parse(removedPrefixData)
    );
    let data = JSON.parse(jsonData);
    return data;
}

/**
 * 对任意个数的参数取hash
 * @param args 任意string参数
 * @returns 带0x前缀的hash
 */
export function keccak256(...args: string[]) {
    const hash = keccak256Hash.create();
    for (let arg of args) hash.update(arg.toString());
    const result = hash.hex();
    return ensure0xPrefix(result);
}

export function sha256Hash(...args: string[]) {
    const hash = sha256.create();
    for (let arg of args) hash.update(arg.toString());
    const result = toHex(hash.digest());
    // console.log(result);
    return result;
}

// 验证正向hash
export function verifyHashForward(
    applicantTempAccount: string,
    r: string,
    currentHash: string,
    PreHash: string,
    log: boolean = false
) {
    if (log)
        console.log(
            `received hash: ${currentHash}, calculated hash: ${
                PreHash === undefined
                    ? keccak256(applicantTempAccount, r)
                    : keccak256(applicantTempAccount, r, PreHash)
            }`
        );
    if (PreHash === undefined) return currentHash === keccak256(applicantTempAccount, r);
    else return currentHash === keccak256(applicantTempAccount, r, PreHash);
}
// 验证反向hash
export function verifyHashBackward(
    applicantTempAccount: string,
    r: string,
    currentHash: string,
    nextHash: string
) {
    if (nextHash === undefined) return currentHash === keccak256(applicantTempAccount, r);
    else return currentHash === keccak256(applicantTempAccount, r, nextHash);
}

/**
 * 两个16进制相加取模, 输入带不带0x前缀都可以
 * @param hex1 hex1
 * @param hex2 hex2
 * @returns (hex1 + hex2) mod 2^256, 返回值不带0x前缀, 对于计算值, 都不带0x
 */
export function addHexAndMod(hex1: string, hex2: string) {
    // format
    hex1 = hex1.startsWith('0x') ? hex1 : '0x' + hex1;
    hex2 = hex2.startsWith('0x') ? hex2 : '0x' + hex2;

    // to bigint
    const num1 = BigInt(hex1);
    const num2 = BigInt(hex2);

    // mod 2^256
    const mod = BigInt(2) ** BigInt(256);
    const result = (num1 + num2) % mod;

    // 将结果转换回64位16进制字符串
    return result.toString(16).padStart(64, '0');
}

export function subHexAndMod(hex1: string, hex2: string) {
    // format
    hex1 = hex1.startsWith('0x') ? hex1 : '0x' + hex1;
    hex2 = hex2.startsWith('0x') ? hex2 : '0x' + hex2;

    // to bigint
    const num1 = BigInt(hex1);
    const num2 = BigInt(hex2);

    // mod 2^256
    const mod = BigInt(2) ** BigInt(256);
    const result = (num1 + mod - num2) % mod;

    // 将结果转换回64位16进制字符串
    return result.toString(16).padStart(64, '0');
}

export function ensure0xPrefix(str: string) {
    if (!str) return str;
    const value = String(str);
    if (value.toLowerCase().startsWith('0x')) {
        return value;
    }
    return `0x${value}`;
}

// 格式化以太坊地址, 显示0x前缀和前后3位字符
export function formatAddress(address: string) {
    if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
        return 'Invalid Address';
    }

    const addressWithoutPrefix = address.slice(2);
    if (addressWithoutPrefix.length <= 6) {
        return address;
    }

    // 获取前3位和后3位
    const prefix = addressWithoutPrefix.slice(0, 3);
    const suffix = addressWithoutPrefix.slice(-3);

    // 组合并返回格式化后的地址
    return `0x${prefix}...${suffix}`;
}

export function padTo64(hexStr: string): string {
    return hexStr.padStart(64, '0');
}

export function wait(timeout: number) {
    return new Promise((resolve) => setTimeout(resolve, timeout));
}
