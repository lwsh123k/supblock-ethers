import { randomBytes } from 'crypto';
import BigInteger, { fromByteArrayUnsigned, fromBuffer, fromHex, ZERO } from 'bigi';
import { getCurveByName, Point } from 'ecurve';
import createKeccakHash from 'keccak';

// 生成scep256k1曲线，获取G和模数n
const ecparams = getCurveByName('secp256k1');
const G = ecparams.G;
const n = ecparams.n;

// 导出ecc签名
const ecc = {
    //生成size字节的随机数
    random(size) {
        let k;
        do {
            k = fromByteArrayUnsigned(randomBytes(size));
        } while (k.gcd(n).toString() != '1');
        return k;
    },

    keccak256(inp) {
        return createKeccakHash('keccak256').update(inp.toString()).digest('hex');
    },

    // 获得字符串中的数字的hash
    getNumberHash(num) {
        let numBuffer = Buffer.from(num, 'hex'); // 转化为buffer
        return createKeccakHash('keccak256').update(numBuffer).digest('hex');
    },

    // 私钥和对应的公钥
    privateKey: null,
    P_self: null,

    // 根据输入设置私钥和对应的公钥
    setKey(private_key) {
        this.privateKey = Buffer.from(private_key, 'hex');
        this.P_self = G.multiply(BigInteger.fromBuffer(this.privateKey));
    },

    //前端解构收到的公钥，本地操作
    R: null,
    P: null,
    deconPublicKey(Rx, Ry, Px, Py) {
        //Crtl + Shift + L 同时编辑
        let Rx_big = new BigInteger(),
            Ry_big = new BigInteger(),
            Px_big = new BigInteger(),
            Py_big = new BigInteger();
        Rx_big.fromString(Rx, 16),
            Ry_big.fromString(Ry, 16),
            Px_big.fromString(Px, 16),
            Py_big.fromString(Py, 16);
        this.R = Point.fromAffine(ecparams, Rx_big, Ry_big);
        this.P = Point.fromAffine(ecparams, Px_big, Py_big);
    },

    //请求签名者：盲化信息,R和P在第一步获得
    deblind: null,
    δ: null,
    blindMessage(m) {
        (this.deblind = this.random(32)), (this.δ = this.random(32));
        let A = this.R.add(G.multiply(this.deblind)).add(this.P.multiply(this.δ));
        let t = A.affineX.mod(n).toString();
        let c = fromHex(this.keccak256((m + t).toString()));
        let cBlinded = c.subtract(this.δ);
        return {
            cBlinded: cBlinded.toString(16),
            c: c.toHex(32),
            deblind: this.deblind.toHex(32),
        };
    },

    //生成size字节的随机数t, 0 <= t < 模数n
    generateRandomT(size) {
        let t;
        do {
            t = fromBuffer(randomBytes(size));
            //console.log("t:",t.toString());
        } while (t.compareTo(n) >= 0 || t.compareTo(ZERO) < 0);
        return t;
    },

    //发送自己的公钥
    k: null,
    getPublicKey() {
        this.k = this.random(32);
        let R = G.multiply(this.k);
        return {
            Rx: R.affineX.toString(16),
            Ry: R.affineY.toString(16),
            Px: this.P_self.affineX.toHex(32),
            Py: this.P_self.affineY.toHex(32),
        };
    },

    //签名者签名
    t: null,
    getSig(cBlinded) {
        let cBlinded_big = new BigInteger();
        cBlinded_big.fromString(cBlinded, 16);
        let sBlind = this.k.subtract(cBlinded_big.multiply(fromBuffer(this.privateKey)));
        this.t = this.generateRandomT(32); //生成多个，使用for循环即可
        sBlind = sBlind.add(this.t).mod(n);
        // sBlind的16进制长度可能为63，而链上存储时要求长度为32字节的2进制数据
        // toHex(32)在长度不够时，补0
        return { sBlind: sBlind.toHex(32), t: this.t.toHex(32) };
    },

    //请求签名者去除盲化信息
    unblindSig(sBlind) {
        sBlind = fromHex(sBlind);
        let s = sBlind.add(this.deblind).mod(n); //增加mod n
        return { s: s.toHex(32) };
    },

    //验证签名
    verifySig(m, c, s, t) {
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
        let toHash = this.P.multiply(c_big.mod(n))
            .add(G.multiply(s_big.mod(n)))
            .affineX.mod(n);
        let result = fromHex(this.keccak256(m + toHash));
        return { result: c_big.equals(result) };
    },
};

export default ecc;
