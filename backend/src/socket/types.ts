export interface NumInfo {
    from: string; // always is 'server'
    to: string; // always is 'plugin'
    applicant: string;
    relay: string;
    blindedFairIntNum: number; // b + fair integer
    fairIntegerNumber: number;
    blindingNumber: number; // b
    url: string;
    hashOfApplicant: string;
}
// current relay -> next relay
export type PreToNextRelayData = {
    from: null | string; // current relay anonymous account
    to: null | string; // relay
    preAppTempAccount: null | string; // 和pre relay对应的pre app temp account, 和AppToRelayData中from对应
    preRelayAccount: null | string; // pre relay anonymous account = from
    hf: null | string;
    hb: null | string;
    b: null | number;
    n: null | number;
    t: null | string;
    l: number;
};

// applicant to relay
export type AppToRelayData = {
    from: null | string; // 申请者地址
    to: null | string;
    appTempAccount: null | string;
    r: null | string;
    hf: null | string;
    hb: null | string;
    b: null | number;
    c: null | string;
    l: number; // 数据序号
    chainIndex: number;
    lastUserRelay?: boolean;
};

// validator send back: 申请者发送init, validator回送token hash
export type ValidatorSendBackSig = {
    from: string;
    to: string;
    chainIndex: number; // 可以不用, 一次将所有hash发送回去
    sBlind: string;
    tokenHash: [string, string, string];
};

export interface ToApplicantSigned {
    chainId: number;
    sBlind: string;
    t_hash: string;
}

export interface SignedAddress {
    sBlind: string;
    t_hashAry: [string, string, string];
}

// 申请者将盲化后的信息发给validator签名
export type AppBlindedAddress = {
    from: string;
    to: string;
    chainId: number; // 可以不用, 一次将所有hash发送回去
    blindedAddress: string;
};
