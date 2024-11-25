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

// 链初始化时, applicant给relay发送消息
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
    point: EccPoint;
    realToken?: [string, string, string];
};

export type EccPoint = {
    Rx: string;
    Ry: string;
    Px: string;
    Py: string;
};

export interface ToApplicantSigned {
    chainId: number;
    sBlind: string;
    t_hash: string;
}

// validator的签名
export interface SignedAddress {
    sBlind: string;
    t_hashAry: [string, string, string];
    t_array: [string, string, string];
}

// 申请者将盲化后的信息发给validator签名
export type AppBlindedAddress = {
    from: string;
    to: string;
    chainId: number; // 可以不用, 一次将所有hash发送回去
    blindedAddress: string;
};

export type hashValues = [string, string, string];

// applicant上传b
export type AppBlindUpload = {
    blindingNumber: number;
    tempAccount: string;
    relayAccount: string;
    hash: string;
    chainId: number; // 第几条链
    relayId: number; // 第几个relay
};
