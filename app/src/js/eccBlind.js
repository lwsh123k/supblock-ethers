import { randomBytes } from 'crypto';
import BigInteger, { fromByteArrayUnsigned, fromBuffer, fromHex, ZERO } from 'bigi';
import { getCurveByName, Point } from 'ecurve';
import createKeccakHash from 'keccak';

//生成size字节的随机数
function random(size) {
    let k;
    do {
        k = fromByteArrayUnsigned(randomBytes(size));
    } while (k.gcd(n).toString() != '1');
    return k;
}

function keccak256(inp) {
    return createKeccakHash('keccak256').update(inp.toString()).digest('hex');
}

// 生成scep256k1曲线，获取G和模数n
let ecparams = getCurveByName('secp256k1');
let G = ecparams.G;
let n = ecparams.n;
let privateKey = Buffer.from(
    '1184cd2cdd640ca42cfc3a091c51d549b2f016d454b2774019c2b2d2e08529fd',
    'hex'
);
let P_self = G.multiply(fromBuffer(privateKey));

//前端解构收到的公钥，本地操作
let R, P;
function deconPublicKey(Rx, Ry, Px, Py) {
    //Crtl + Shift + L 同时编辑
    let Rx_big = new BigInteger(),
        Ry_big = new BigInteger(),
        Px_big = new BigInteger(),
        Py_big = new BigInteger();
    Rx_big.fromString(Rx, 16),
        Ry_big.fromString(Ry, 16),
        Px_big.fromString(Px, 16),
        Py_big.fromString(Py, 16);
    R = Point.fromAffine(ecparams, Rx_big, Ry_big);
    P = Point.fromAffine(ecparams, Px_big, Py_big);
}

//请求签名者盲化信息,R和P在第一步获得
let γ, δ;
function blindMessage(m) {
    (γ = random(32)), (δ = random(32));
    let A = R.add(G.multiply(γ)).add(P.multiply(δ));
    let t = A.affineX.mod(n).toString();
    let c = fromHex(keccak256((m + t).toString()));
    let cBlinded = c.subtract(δ);
    return { cBlinded: cBlinded.toString(16), c: c.toString(16) };
}

//生成size字节的随机数t, 0 <= t < 模数n
function generateRandomT(size) {
    do {
        var t = fromBuffer(randomBytes(size));
        //console.log("t:",t.toString());
    } while (t.compareTo(n) >= 0 || t.compareTo(ZERO) < 0);
    return t;
}

//发送自己的公钥
let k;
function getPublicKey() {
    k = random(32);
    R = G.multiply(k);
    return {
        Rx: R.affineX.toString(16),
        Ry: R.affineY.toString(16),
        Px: P_self.affineX.toString(16),
        Py: P_self.affineY.toString(16),
    };
}

//签名者签名
function getSig(cBlinded) {
    let cBlinded_big = new BigInteger();
    cBlinded_big.fromString(cBlinded, 16);
    let sBlind = k.subtract(cBlinded_big.multiply(fromBuffer(privateKey)));
    //console.log("sBlind", sBlind.toString());
    let t = generateRandomT(32); //生成多个，使用for循环即可
    sBlind = sBlind.add(t).mod(n);
    return { sBlind: sBlind.toString(16), t: t.toHex(32) };
}

//请求签名者去除盲化信息
function unblindSig(sBlind) {
    sBlind = fromHex(sBlind);
    let s = sBlind.add(γ).mod(n); //增加mod n
    return { s: s.toString(16) };
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
    s_big = s_big.subtract(t_big);
    let toHash = P.multiply(c_big.mod(n))
        .add(G.multiply(s_big.mod(n)))
        .affineX.mod(n);
    let result = fromHex(keccak256(m + toHash));
    return { result: c_big.equals(result) };
}

export default {
    deconPublicKey,
    blindMessage,
    unblindSig,
    verifySig,
    getPublicKey,
    getSig,
};
