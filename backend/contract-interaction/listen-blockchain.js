const { ethers } = require('ethers');
const contractAddress = require('./contract-address.json');

class FairIntegerContract {
    abi = [
        'event ResHashUpload(address indexed from, address indexed to, bytes32 infoHashB)',
        'event ReqInfoUpload(address indexed from, address indexed to, uint8 state)',
        'event ResInfoUpload(address indexed from, address indexed to, uint8 state)',
        'event UpLoadNum(address indexed from, address indexed to, uint8 state)',
        'function setReqHash(address receiver, bytes32 mHash) public',
        `function setResHash(address sender, bytes32 mHash) public`,
        `function setReqInfo(address receiver, uint256 ni, uint256 ri) public`,
        `function setResInfo(address sender, uint256 ni, uint256 ri) public`,
        'function getReqExecuteTime(address receiver) public view returns (uint256, uint256, uint256)',
        'function getResExecuteTime(address sender) public view returns (uint256, uint256, uint256)',
        `function verifyInfo(address sender, address receiver, uint256 index) public view returns (string memory)`,
        'function reuploadNum(address sender, address receiver, uint256 index, uint8 source, uint ni, uint ri) public',
        'function showNum(address sender, address receiver, uint256 index) public view returns (uint256, uint256, uint8)',
        'function getState(address sender, address receiver, uint256 index) public view returns (uint8)',
        'function showLatestNum(address sender, address receiver) public view returns (uint256, uint256, uint8)',
    ];

    constructor() {
        this.FairIntegerAddress = contractAddress.FairIntegerContract;
        // localhost被解析成IPv6, 所以此处要使用ip地址
        this.provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
        this.contract = new ethers.Contract(this.FairIntegerAddress, this.abi, this.provider);

        this.provider
            .getBlockNumber()
            .then((blockNumber) => {
                console.log('Current block number:', blockNumber);
            })
            .catch((err) => {
                console.error('Error:', err);
            });
    }

    listenNumUpload(sendPluginMessage) {
        let filter = this.contract.filters.UpLoadNum(null, null);
        console.log(filter);
        this.contract.on(filter, async (sender, receiver, state) => {
            // 只有relay和applicant都上传随机数时才会extension发送信息
            console.log(`sender: ${sender}, receiver: ${receiver}, state: ${state}`);
            if (state === 1) {
                console.log(`sender: ${sender}, receiver: ${receiver}, state: ${state}`);
                let latestNumResult = await this.contract.showLatestNum(sender, receiver);
                let fairIntegerNumber =
                    (latestNumResult[0].toNumber() + latestNumResult[1].toNumber()) % 100;
                sendPluginMessage(sender, receiver, fairIntegerNumber);
            }
        });
    }
}

module.exports = FairIntegerContract;
