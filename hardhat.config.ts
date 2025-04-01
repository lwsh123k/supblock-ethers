import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
    solidity: '0.8.18',

    networks: {
        // use anvil
        // cargo install --git https://github.com/foundry-rs/foundry --profile release --locked forge cast chisel anvil
        anvil: {
            url: 'http://127.0.0.1:8545',
            accounts: {
                mnemonic: 'test test test test test test test test test test test junk',
                path: "m/44'/60'/0'/0",
                initialIndex: 0,
                count: 301,
                passphrase: '',
            },
        },
        hardhat: {
            mining: {
                auto: true,
                interval: 1500,
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
    // 生成typechain: npx hardhat compile
    typechain: {
        outDir: './typechain',
        target: 'ethers-v5',
    },
};

export default config;
