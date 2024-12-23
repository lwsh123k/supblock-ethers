import { getFairIntGen } from './getContractInstance';

export async function getAccountInfoByContract(index: number) {
    let fairIntGen = await getFairIntGen();
    let res = await fairIntGen.getAddressById(index);
    console.log(res);
    return { address: res.account, publicKey: res.publicKey };
}
