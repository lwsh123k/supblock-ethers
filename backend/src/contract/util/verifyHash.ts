import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex as toHex, randomBytes } from '@noble/hashes/utils';

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

// 对任意个数的参数取hash
export function keccak256(...args: string[]) {
    const hash = sha256.create();
    for (let arg of args) hash.update(arg.toString());
    const result = toHex(hash.digest());
    // console.log(result);
    return result;
}
