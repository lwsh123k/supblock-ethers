const { ethers } = require('ethers');
var keccak = require('keccak');
const { keccak256 } = require('js-sha3');

// 测试: 私钥 => 公钥 => address

// 输入私钥
const privateKey = '0x1184cd2cdd640ca42cfc3a091c51d549b2f016d454b2774019c2b2d2e08529fd';

// 根据私钥创建钱包
const wallet = new ethers.Wallet(privateKey);

// 获取公钥和地址
let publicKey = wallet.publicKey;
const address = wallet.address;
console.log(`Public Key: ${publicKey}`);

// 由公钥得出地址时，记得把0x04前缀去掉
let newPk = publicKey.substring(4);
// 把newPk当成了字符串
// 实际上应该把newPk这个字符串中的内容取出来，转化为buffer
// let pkBuffer = Buffer.from(newPk);
let pkBuffer = Buffer.from(newPk, 'hex'); // 转化为buffer
let pkBytes = Uint8Array.from(pkBuffer); // 转化为bytes
console.log(`Public Key Hash: ${keccak('keccak256').update(pkBuffer).digest('hex')}`);
console.log(keccak256(pkBytes));
console.log(`Address: ${address}`);
