require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-chai-matchers'); // 引入断言

/** @type import('hardhat/config').HardhatUserConfig */
// 随机3-6s 产生一个区块
module.exports = {
    solidity: '0.8.12',
    networks: {
        ganache: { url: 'http://127.0.0.1:8545' },
        hardhat: {
            mining: {
                auto: false,
                interval: [3000, 6000],
            },
            accounts: {
                mnemonic: 'test test test test test test test test test test test junk',
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 301,
                passphrase: '',
            },
        },
    },
};
