import { ethers } from 'ethers';
import EthCrypto, { cipher } from 'eth-crypto';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex as toHex } from '@noble/hashes/utils';

// 计算hash, 使用keccak256, 保证数据类型与solidity中的数据类型一致
export function getHash(ni: number, ta: number, tb: number, ri: string) {
    const hash = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256', 'uint256', 'uint256'],
        [ni, ta, tb, ri]
    );
    return hash;
}
//计算字符串的hash
export function getStringHash(param: string) {
    // 如果 param 以 "0x" 开头，去掉它进行后续处理
    if (param.startsWith('0x')) {
        param = param.slice(2);
    }

    // 检查长度是否为奇数，如果是则补一个 "0"
    if ((param.length % 2) !== 0) {
        param = '0' + param;
    }

    // 在前面重新添加 "0x" 前缀
    param = '0x' + param;

    const hash = ethers.utils.keccak256(param);
    return hash;
}
//solidityKeccak256 在计算哈希值时，会根据你指定的类型（如 string）对输入值进行 ABI 编码。
// export function getStringHash(param: string) {
//     const hash = ethers.utils.solidityKeccak256(
//         ['string'],  // 参数类型
//         [param]      // 参数值
//     );
//     return hash;
// }


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
// 返回的16进制加上0x前缀(grpc: binding number, r)
export async function getEncryptData(publicKey: string, data: any) {
    // publicKey: 不带0x
    const removedPrefixpublicKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
    let jsonData = JSON.stringify(data);
    let encryptedData = await EthCrypto.encryptWithPublicKey(removedPrefixpublicKey, jsonData);
    return '0x' + cipher.stringify(encryptedData);
}

// 使用私钥解密
// 解密: 字符串 -> 解密对象 -> json对象 -> 对象
export async function getDecryptData(privateKey: string, encryptedData: string) {
    // privatekay: 带0x前缀, encryptedData: 不带0x前缀
    privateKey = privateKey.startsWith('0x') ? privateKey : '0x' + privateKey;
    const removedPrefixData = encryptedData.startsWith('0x')
        ? encryptedData.slice(2)
        : encryptedData;
    let jsonData = await EthCrypto.decryptWithPrivateKey(
        privateKey,
        cipher.parse(removedPrefixData)
    );
    let data = JSON.parse(jsonData);
    return data;
}

// 对任意个数的参数取hash
export function keccak256(...args: string[]) {
    const hash = sha256.create();
    for (let arg of args) hash.update(arg.toString());
    const result = toHex(hash.digest());
    // console.log(result);
    return result;
}

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
