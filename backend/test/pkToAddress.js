const { ethers } = require('ethers');
const keccak = require('keccak');
const { keccak256 } = require('js-sha3');
const ecurve = require('ecurve');
const BigInteger = require('bigi');

// 输入法中英文标点符号转换:ctrl + 句号
// 测试: 私钥 => 公钥 => address

// 输入私钥
const privateKey = '3c98f3cb0a8ea0820c95891d439c7238be040e9683d363ec2fc2bdfa2c935113';

// 根据私钥创建钱包
const wallet = new ethers.Wallet(privateKey);

// 获取公钥和地址
let publicKey = wallet.publicKey;
const address = wallet.address;
console.log(`Public Key: ${publicKey}`);

// 由公钥得出地址时,记得把0x04前缀去掉
let newPk = publicKey.substring(4);
// 把newPk当成了字符串
// 实际上应该把newPk这个字符串中的内容取出来,转化为buffer
// let pkBuffer = Buffer.from(newPk);
let pkBuffer = Buffer.from(newPk, 'hex'); // 转化为buffer
let pkBytes = Uint8Array.from(pkBuffer); // 转化为bytes
console.log(`Public Key Hash: ${keccak('keccak256').update(pkBuffer).digest('hex')}`);
console.log(keccak256(pkBytes));
console.log(`Address: ${address}`);

// 测试由secp256k1得到私钥对应的公钥

// 生成scep256k1曲线，获取G和模数n
let ecparams = ecurve.getCurveByName('secp256k1');
let P_self = ecparams.G.multiply(BigInteger.fromBuffer(Buffer.from(privateKey, 'hex')));
let px = '0x' + P_self.affineX.toHex();
let py = '0x' + P_self.affineY.toHex();
console.log('px:', px);
console.log('py:', py);
