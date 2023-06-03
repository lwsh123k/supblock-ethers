require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-chai-matchers'); // 引入断言

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: '0.8.12',
    networks: {
        ganache: { url: 'http://127.0.0.1:7545' },
    },
};
