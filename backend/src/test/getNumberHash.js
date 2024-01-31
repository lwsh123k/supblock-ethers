const keccak = require('keccak');
const BigInteger = require('bigi');
const { keccak256 } = require('js-sha3');

// 字符串内容为数字，得到数字的hash

let num = '03bff9bdeb8cc0c90ffdb7d93a64b804b72570a3710649a77286e1226d66df93';
let numBuffer = Buffer.from(num, 'hex'); // 转化为buffer
let pkBytes = Uint8Array.from(numBuffer); // 转化为bytes
console.log(`num Hash: ${keccak('keccak256').update(numBuffer).digest('hex')}`);

// 测试toString结果:不带0x
let key = '1184cd2cdd640ca42cfc3a091c51d549b2f016d454b2774019c2b2d2e08529fd';
let privateKey = BigInteger.fromBuffer(Buffer.from(key, 'hex'));
console.log(privateKey.toString(16));
