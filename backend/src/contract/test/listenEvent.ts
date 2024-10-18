import { ethers } from 'ethers';
import address from './contract-address.json';
import { fairIntegerAbi } from './abi/abi';

class FairIntegerContract {
    provider;
    contract;
    constructor() {
        // localhost被解析成IPv6, 所以此处要使用ip地址
        this.provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        this.contract = new ethers.Contract(address.FairInteger, fairIntegerAbi, this.provider);

        this.provider
            .getBlockNumber()
            .then((blockNumber) => {
                console.log('Current block number:', blockNumber);
            })
            .catch((err) => {
                console.error('Error:', err);
            });
    }

    listenNumUpload(
        sendPluginMessage: (sender: string, receiver: string, fairIntegerNumber: number) => void
    ) {
        let filter = this.contract.filters.UpLoadNum(null, null);
        console.log(filter);
        this.contract.on(filter, async (sender, receiver, state, randomNum) => {
            // 只有relay和applicant都上传随机数时才会extension发送信息
            console.log(`sender: ${sender}, receiver: ${receiver}, state: ${state}`);
            if ([1, 8, 9].includes(state)) {
                console.log(`sender: ${sender}, receiver: ${receiver}, state: ${state}`);
                let latestNumResult = await this.contract.showLatestNum(sender, receiver);
                let fairIntegerNumber;
                if (state === 1)
                    fairIntegerNumber =
                        ((latestNumResult[0].toNumber() + latestNumResult[1].toNumber()) % 99) + 1;
                else if (state === 8) fairIntegerNumber = latestNumResult[0].toNumber();
                else if (state === 9) fairIntegerNumber = latestNumResult[1].toNumber();

                sendPluginMessage(sender, receiver, fairIntegerNumber);
            }
        });
    }
}

export { FairIntegerContract };
