import crypto from 'crypto';
import BigInteger from 'bigi';
import ecurve, { Point } from 'ecurve';
import createKeccakHash from 'keccak';
import { Buffer } from 'buffer';
import { AppBlindedAddress, SignedAddress, ToApplicantSigned, ValidatorSendBackSig } from './types';
import { Socket } from 'socket.io';
import { logger } from '../util/logger';

// 生成size字节的随机数
function random(size: number): BigInteger {
    let k: BigInteger;
    do {
        k = BigInteger.fromBuffer(crypto.randomBytes(size));
    } while (k.gcd(n).toString() !== '1');
    return k;
}

function keccak256(inp: string): string {
    return createKeccakHash('keccak256').update(inp.toString()).digest('hex');
}

// 生成secp256k1曲线，获取G和模数n
const ecparams = ecurve.getCurveByName('secp256k1');
const G = ecparams!.G;
const n = ecparams!.n;
const privateKey = Buffer.from(
    '1184cd2cdd640ca42cfc3a091c51d549b2f016d454b2774019c2b2d2e08529fd',
    'hex'
);
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
function blindMessage(m: string): { cBlinded: string; c: string } {
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
function getPublicKey(): { Rx: string; Ry: string; Px: string; Py: string } {
    k = random(32);
    R = G.multiply(k);
    return {
        Rx: R.affineX.toString(16),
        Ry: R.affineY.toString(16),
        Px: P_self.affineX.toString(16),
        Py: P_self.affineY.toString(16),
    };
}

// 签名者签名
function getSig(cBlinded: string): { sBlind: string; tAry: [string, string, string] } {
    const cBlinded_big = new BigInteger(cBlinded, 16, undefined);
    let sBlind = k.subtract(cBlinded_big.multiply(BigInteger.fromBuffer(privateKey)));
    let tAry: BigInteger[] = new Array(3);
    //用于转换为string类型返回
    let tStringAry: [string, string, string] = ['', '', ''];
    for (let i = 0; i < 3; i++) {
        tAry[i] = generateRandomT(32);
        sBlind = sBlind.add(tAry[i]).mod(n);
        tStringAry[i] = tAry[i].toString(16);
    }

    return { sBlind: sBlind.toString(16), tAry: tStringAry };
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
        const toHash = P.multiply(c_big.mod(n))
            .add(G.multiply(adjusted_s.mod(n)))
            .affineX.mod(n);
        const result = BigInteger.fromHex(keccak256(m + toHash.toString()));

        return { result: c_big.equals(result) };
    } catch (error) {
        return { result: false };
    }
}

export type hashValues = [string, string, string];
export const addressToHashMap: Map<string, SignedAddress> = new Map();
export const chainNumber = 3;
export function signBlindedAddress(socket: Socket, data: AppBlindedAddress) {
    logger.info('applicant to validator: get sig of blinded address');
    let { blindedAddress, chainId, from, to } = data;

    if (chainId < 0 || chainId >= 3) {
        logger.error(`invalid chain id ${chainId} `);
        return;
    }
    //logger.info('validator had receive blindedAdress');
    let { sBlind, tAry } = getSig(blindedAddress);
    let t_hashAry: [string, string, string] = ['', '', ''];
    //addressToHashMap.set(from, signedAds.t_hashAry)
    //let t_hash = getStringHash(signedAds.t);
    for (let i = 0; i < 3; i++) {
        t_hashAry[i] = keccak256(tAry[i]);
    }
    let signedAddress: SignedAddress = { sBlind, t_hashAry };
    //因为from定义时可能为null，不检查一下会报错
    if (!from) {
        logger.info('from is null or undefined');
        return;
    }
    addressToHashMap.set(from, signedAddress);
    //addressToHashMap.set(from, signedAds.t_hashAry)
    //logger.info(`signedAds.sBlind:${signedAds.sBlind},signedAds.t_hashAry:${signedAds.t_hashAry}`);
    //logger.info(`t_hash:${t_hash}`);
    let sendBackData: Partial<ValidatorSendBackSig> = {};
    sendBackData.from = data.to!;
    sendBackData.to = data.from!;
    sendBackData.tokenHash = signedAddress.t_hashAry;
    sendBackData.sBlind = signedAddress.sBlind;
    sendBackData.chainIndex = data.chainId;
    // socket.emit('hash forward verify correct', sendBackData);
    socket.emit('validator send sig and hash', sendBackData);
}
export default {
    deconPublicKey,
    blindMessage,
    unblindSig,
    verifySig,
    getPublicKey,
    getSig,
};
