import { keccak256 } from './utils';

// 验证正向hash
export function verifyHashForward(
    applicantTempAccount: string,
    r: string,
    currentHash: string,
    PreHash: string | null
) {
    if (PreHash === null) return currentHash === keccak256(applicantTempAccount, r);
    else return currentHash === keccak256(applicantTempAccount, r, PreHash);
}

// 验证反向hash
export function verifyHashBackward(
    applicantTempAccount: string,
    r: string,
    currentHash: string,
    nextHash: string | null
) {
    if (nextHash === null) return currentHash === keccak256(applicantTempAccount, r);
    else return currentHash === keccak256(applicantTempAccount, r, nextHash);
}
