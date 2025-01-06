import { ensure0xPrefix, getEncryptData, keccak256 } from '../../contract/util/utils';
import { AppToRelayData, PreToNextRelayData } from '../../socket/types';
import { chainLength, validatorAccount } from '../../socket/usersData';

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

    // console.log(data);
    let encryptedData1 = await getEncryptData(selectedPubkey, data); // data 加密
    let dataHash1 = keccak256(JSON.stringify(data)); // data hash
    dataHash1 = ensure0xPrefix(dataHash1);
    return { constructedData: data, encryptedData1, dataHash1 };
}

/**
 * 构造relay L -> validator的数据
 * @param chainid 第几条链
 * @param l 第几个relay: 0, 1, 2...
 * @param PA applicant收到的数据
 */
export function constructFinalData(PA: AppToRelayData, selectedAddress: string, token: string) {
    let data = {
        from: selectedAddress,
        to: validatorAccount,
        preAppTempAccount: PA.appTempAccount,
        preRelayAccount: selectedAddress,
        hf: PA.hf,
        hb: PA.hb,
        l: chainLength + 1,
        t: token,
    };

    return data;
}
