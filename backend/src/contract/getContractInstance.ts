import { provider } from './util/provider';
import address from './contract-address.json';
import { FairInteger__factory, StoreData__factory } from './types';

// return fair integer contract instance
export function getFairIntGen() {
    // 两种实例化方式
    return FairInteger__factory.connect(address.FairInteger, provider);
}

// return data storage contract instance
export function getStoreData() {
    return StoreData__factory.connect(address.StoreData, provider);
}
