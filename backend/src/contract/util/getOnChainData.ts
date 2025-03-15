import { getFairIntGen } from './getContractInstance';

export async function getAccountInfoByContract(index: number) {
    let fairIntGen = await getFairIntGen();
    let res = await fairIntGen.getAddressById(index);
    console.log(res);
    return { address: res.account, publicKey: res.pubKey };
}

export async function getAccountInfoByInfoHash(infoHash: string) {
    let fairIntGen = await getFairIntGen();
    let res = await fairIntGen.getNumByHash(infoHash);
    console.log(res);
    return res;
}

export async function getBlindedFairIntByInfoHash(infoHash: string, b: number) {
    let fairIntGen = await getFairIntGen();
    let res = await fairIntGen.getNumByHash(infoHash);
    // 检查reuploadFlags的bit 0和bit 1
    const reuploadA = (res.reuploadFlags & 0x01) !== 0;
    const reuploadB = (res.reuploadFlags & 0x02) !== 0;

    if (reuploadA) {
        return ((res.niA.toNumber() + b) % 99) + 1;
    } else if (reuploadB) {
        return ((res.niB.toNumber() + b) % 99) + 1;
    } else {
        return ((res.niA.toNumber() + res.niB.toNumber() + b) % 99) + 1;
    }
}
