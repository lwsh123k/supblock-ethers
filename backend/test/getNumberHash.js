var keccak = require('keccak');
const { keccak256 } = require('js-sha3');

// 字符串内容为数字，得到数字的hash

let num = '03bff9bdeb8cc0c90ffdb7d93a64b804b72570a3710649a77286e1226d66df93';
let numBuffer = Buffer.from(num, 'hex'); // 转化为buffer
let pkBytes = Uint8Array.from(numBuffer); // 转化为bytes
console.log(`num Hash: ${keccak('keccak256').update(numBuffer).digest('hex')}`);
