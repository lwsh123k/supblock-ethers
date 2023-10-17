import storeMsgContract from '../contract-interaction/strore-msg-contract';
import PublicKeyEncrypt from '../encrypt';

const StoreMsg = {
    // 初始化
    start(socket, provider) {
        this.socket = socket;
        storeMsgContract.start(provider);
    },

    // 设置wallet
    setWallet(private_key) {
        storeMsgContract.setWallet(private_key);
    },

    // listen data from applicant
    listenAppData(decryptKey, listenAddress) {
        // 发送方(applicant and pre relay)使用anonymous account, 接收方使用real name account接收(此时发送方并不知道接收方的anonymous account)
        storeMsgContract.listenApp2RelayData(
            listenAddress,
            decryptKey,
            PublicKeyEncrypt.getDecryptData
        );
    },

    // listen data from pre relay
    listenPreRelayData(decryptKey, listenAddress) {
        storeMsgContract.listenPre2NextData(
            listenAddress,
            decryptKey,
            PublicKeyEncrypt.getDecryptData
        );
    },

    async setApp2RelayData(receiverAddress, encryptedData) {
        await storeMsgContract.setApp2RelayData(receiverAddress, encryptedData);
    },

    async setData2NextRelay(receiverAddress, encryptedData) {
        await storeMsgContract.setData2NextRelay(receiverAddress, encryptedData);
    },
};
export default StoreMsg;
