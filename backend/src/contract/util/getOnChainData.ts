import { getFairIntGen } from './getContractInstance';

export async function getAccountInfoByContract(index: number) {
    let fairIntGen = await getFairIntGen();
    let res = await fairIntGen.getAddressById(index);
    console.log(res);
    return { address: res.account, publicKey: res.publicKey };
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
    if (res.reuploadInfoA) return res.niA.toNumber();
    else if (res.reuploadInfoB) return res.niB.toNumber();
    else return ((res.niA.toNumber() + res.niB.toNumber() + b) % 99) + 1;
}
