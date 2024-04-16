// 引入即执行
import { fairIntegerFunction } from './FairInteger';
import { storeDataFunction } from './StoreData';

async function executeInOrder() {
    await fairIntegerFunction();
    await storeDataFunction();
}

executeInOrder().then(() => console.log('Both functions executed in order.'));
