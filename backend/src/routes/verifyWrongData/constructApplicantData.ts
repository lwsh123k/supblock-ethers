import { ensure0xPrefix, getEncryptData, keccak256 } from '../../contract/util/utils';
import { AppToRelayData } from '../../socket/types';

export const chainLength = 3;
export const chainNumber = 3;
/**
 * 返回加密数据和hash
 * @param chainid 第几条链
 * @param l 第几个relay: 0, 1, 2...
 * @param PA applicant收到的数据
 */
export async function constructApplicantData(
    chainid: number,
    l: number,
    PA: AppToRelayData,
    selectedPubkey: string
) {
    let data: AppToRelayData = {
        from: null,
        to: null,
        appTempAccount: null,
        appTempAccountPubkey: null,
        r: null,
        hf: null,
        hb: null,
        b: null,
        c: null,
        l: l,
        chainIndex: chainid,
    };
    data.from = PA.from;
    data.to = PA.to;
    data.r = PA.r;
    data.hf = PA.hf;
    data.hb = PA.hb;
    if (l === 0) {
        data.b = PA.b;
    } else if (l >= 1 && l <= chainLength - 1) {
        data.appTempAccount = PA.appTempAccount;
        data.appTempAccountPubkey = PA.appTempAccountPubkey;
        data.b = PA.b;
        data.c = PA.c;
    } else if (l === chainLength) {
        data.appTempAccount = PA.appTempAccount;
        data.appTempAccountPubkey = PA.appTempAccountPubkey;
        data.c = PA.c;
    }

    console.log(data);
    let encryptedData1 = await getEncryptData(selectedPubkey, data); // data 加密
    let dataHash1 = keccak256(JSON.stringify(data)); // data hash
    dataHash1 = ensure0xPrefix(dataHash1);
    return { encryptedData1, dataHash1 };
}
