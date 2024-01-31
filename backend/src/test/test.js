const BigInteger = require('bigi');

let s = BigInteger.fromHex('f2e9001aab312f338696eaac7256993423f1711bb4809003d67090d62a56d382');
let deblind = BigInteger.fromHex(
    '03bff9bdeb8cc0c90ffdb7d93a64b804b72570a3710649a77286e1226d66df93'
);

console.log(s.subtract(deblind).toHex());

module.exports = { a: 1 };
console.log(module.exports, exports, module.exports === exports);
