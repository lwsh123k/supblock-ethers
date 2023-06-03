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
    console.log('n:', n.toHex());
    s_big = s_big.subtract(t_big).mod(n);
    console.log('s-t:', s_big.toString());
    let toHash = curvePt
        .multiply(c_big.mod(n))
        .add(G.multiply(s_big.mod(n)))
        .affineX.mod(n);

    console.log('P * c:', curvePt.multiply(c_big.mod(n)).toString());
    console.log('G * s:', G.multiply(s_big.mod(n)).toString());
    console.log('affineX:', toHash.toString());
    let result = BigInteger.fromHex(keccak256(m + toHash));
    return { result: c_big.equals(result) };
}

let result = verifySig(
    'err',
    'fa8d38dcb49a1afc455e9dd0beae16e2bb9df7121d491a70cd6e3edeba612168',
    '9bee4ec45f5c338b95bedf21b0d348c90364bb7d3d77da3ce3a21bb9548173f9',
    '62edb225bd1f1203c7c1f6f4b0c5da82abf3e9b4f2a8c40614a4b977e63e8494'
);

console.log(result);
