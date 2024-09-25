import crypto from 'crypto';
import BigInteger from 'bigi';
import ecurve, { Point } from 'ecurve';
import createKeccakHash from 'keccak';
import { Buffer } from 'buffer';

// 生成size字节的随机数
function random(size: number): BigInteger {
    let k: BigInteger;
    do {
        k = BigInteger.fromBuffer(crypto.randomBytes(size));
    } while (k.gcd(n).toString() !== "1");
    return k;
}

function keccak256(inp: string): string {
    return createKeccakHash('keccak256').update(inp.toString()).digest('hex');
}

// 生成secp256k1曲线，获取G和模数n
const ecparams = ecurve.getCurveByName('secp256k1');
const G = ecparams!.G;
const n = ecparams!.n;
const privateKey = Buffer.from("1184cd2cdd640ca42cfc3a091c51d549b2f016d454b2774019c2b2d2e08529fd", 'hex');
const P_self = G.multiply(BigInteger.fromBuffer(privateKey));

// 前端解构收到的公钥，本地操作
let R: Point, P: Point;
function deconPublicKey(Rx: string, Ry: string, Px: string, Py: string): void {
    const Rx_big = new BigInteger(Rx, 16, undefined);
    const Ry_big = new BigInteger(Ry, 16, undefined);
    const Px_big = new BigInteger(Px, 16, undefined);
    const Py_big = new BigInteger(Py, 16, undefined);

    R = Point.fromAffine(ecparams!, Rx_big, Ry_big);
    P = Point.fromAffine(ecparams!, Px_big, Py_big);
}

// 请求签名者盲化信息,R和P在第一步获得
let γ: BigInteger, δ: BigInteger;
function blindMessage(m: string): { cBlinded: string, c: string } {
    γ = random(32);
    δ = random(32);
    const A = R.add(G.multiply(γ)).add(P.multiply(δ));
    const t = A.affineX.mod(n).toString();
    const c = BigInteger.fromHex(keccak256((m + t).toString()));
    const cBlinded = c.subtract(δ);
    return { cBlinded: cBlinded.toString(16), c: c.toString(16) };
}

// 生成size字节的随机数t, 0 <= t < 模数n
function generateRandomT(size: number): BigInteger {
    let t: BigInteger;
    do {
        t = BigInteger.fromBuffer(crypto.randomBytes(size));
    } while (t.compareTo(n) >= 0 || t.compareTo(BigInteger.ZERO) < 0);
    return t;
}

// 发送自己的公钥
let k: BigInteger;
function getPublicKey(): { Rx: string, Ry: string, Px: string, Py: string } {
    k = random(32);
    R = G.multiply(k);
    return {
        Rx: R.affineX.toString(16),
        Ry: R.affineY.toString(16),
        Px: P_self.affineX.toString(16),
        Py: P_self.affineY.toString(16)
    };
}

// 签名者签名
function getSig(cBlinded: string): { sBlind: string, t: string } {
    const cBlinded_big = new BigInteger(cBlinded, 16, undefined);
    let sBlind = k.subtract(cBlinded_big.multiply(BigInteger.fromBuffer(privateKey)));
    const t = generateRandomT(32);
    sBlind = sBlind.add(t).mod(n);
    return { sBlind: sBlind.toString(16), t: t.toString(16) };
}

// 请求签名者去除盲化信息
function unblindSig(sBlind: string): { s: string } {
    const sBlind_big = BigInteger.fromHex(sBlind);
    const s = sBlind_big.add(γ).mod(n);
    return { s: s.toString(16) };
}

// 验证签名
function verifySig(m: string, c: string, s: string, t: string): { result: boolean } {
    try {
        const c_big = new BigInteger(c, 16, undefined);
        const s_big = new BigInteger(s, 16, undefined);
        const t_big = new BigInteger(t, 16, undefined);

        const adjusted_s = s_big.subtract(t_big);
        const toHash = P.multiply(c_big.mod(n)).add(G.multiply(adjusted_s.mod(n))).affineX.mod(n);
        const result = BigInteger.fromHex(keccak256(m + toHash.toString()));

        return { result: c_big.equals(result) };
    } catch (error) {
        return { result: false };
    }
}

export default {
    deconPublicKey,
    blindMessage,
    unblindSig,
    verifySig,
    getPublicKey,
    getSig
};
