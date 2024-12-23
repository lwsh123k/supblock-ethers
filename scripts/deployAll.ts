// 引入即执行
import { activateAccount } from './activate/activateAccount';
import { fairIntegerFunction } from './FairInteger';
import { storeDataFunction } from './StoreData';

async function executeInOrder() {
    let fairIntAddress = await fairIntegerFunction();
    await storeDataFunction();
    await activateAccount(fairIntAddress);
}

executeInOrder().then(() => console.log('Both functions executed in order.'));
