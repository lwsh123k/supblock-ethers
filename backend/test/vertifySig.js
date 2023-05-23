let crypto = require('crypto');
const BigInteger = require('bigi');
const ecurve = require('ecurve');
const createKeccakHash = require('keccak');

let privateKey = new Buffer(
    '3c98f3cb0a8ea0820c95891d439c7238be040e9683d363ec2fc2bdfa2c935113',
    'hex'
);
let ecparams = ecurve.getCurveByName('secp256k1'); //or secp256k1
let curvePt = ecparams.G.multiply(BigInteger.fromBuffer(privateKey));
let G = ecparams.G;
let n = ecparams.n;

function toHex(inp) {
    return BigInteger.fromBuffer(inp.toString(), 'hex').toHex();
}

function keccak256(inp) {
    return createKeccakHash('keccak256').update(inp.toString()).digest('hex');
}
//验证签名
function verifySig(m, c, s, t) {
    //step 5, signature = (c, s), if c == result, result = SHA256(m || Rx(cP + sG) mod n)
    let c_big = new BigInteger(),
        s_big = new BigInteger(),
        t_big = new BigInteger();
    try {
        //16进制数据的位数为偶数位,所以要进行判断转换是否出错
        c_big.fromString(c, 16);
        s_big.fromString(s, 16);
        t_big.fromString(t, 16);
    } catch (error) {
        return { result: false };
    }
    console.log('s:', s_big.toString());
    s_big = s_big.subtract(t_big).mod(n);
    console.log('s-t:', s_big.toString());
    let toHash = curvePt
        .multiply(c_big.mod(n))
        .add(G.multiply(s_big.mod(n)))
        .affineX.mod(n);
    let result = BigInteger.fromHex(keccak256(m + toHash));
    return { result: c_big.equals(result) };
}

let result = verifySig(
    'sdq',
    'e67b5ac2f51d6b4a7678f68aab798ddba036e347393eb107548d48e89401bfc0',
    '085e2a6d337e2cdcfd666edd3aaa0d8a9da529293ab4a795317106b2866f7916',
    '3e923088fe463a17718aa7fb1c8e65f74468c13eb3d4d1f35434d564fd8d0754'
);

console.log(result);
