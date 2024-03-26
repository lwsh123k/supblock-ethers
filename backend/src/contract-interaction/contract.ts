import { provider } from './provider';
import address from './contract-address.json';
import { FairInteger__factory } from './types';

// 返回合约实例对象
export function getFairIntGen() {
    // 两种实例化方式
    return FairInteger__factory.connect(address.FairInteger, provider);
}
