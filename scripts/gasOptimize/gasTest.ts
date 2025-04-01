// gas-test.js
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { getApp2RelayEncryptedData } from './getApp2RelayData';
import { getPre2NextEncryptedData } from './getPre2NextData';
import { getNextRelay2AppData } from './getRelayResData';
// 导入 typechain 生成的类型
import { FairInteger, StoreData } from '../../typechain';
import { FairInteger__factory, StoreData__factory } from '../../typechain/factories/contracts';

// Gas reporter utility
function printGasStats(data: number[]): { avg: number; min: number; max: number; total: number } {
    const avg = data.reduce((sum: number, val: number) => sum + val, 0) / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);

    return {
        avg: Math.round(avg),
        min,
        max,
        total: data.reduce((sum: number, val: number) => sum + val, 0),
    };
}

// npx hardhat test scripts/gasOptimize/gasTest.ts
describe('Gas Usage Test', function () {
    // Increase timeout for long-running tests
    this.timeout(60000000);

    let fairInteger: FairInteger;
    let storeData: StoreData;
    let deployer: SignerWithAddress, requester: SignerWithAddress, responder: SignerWithAddress;
    const NUM_ITERATIONS = 1000;

    // Gas measurement arrays for FairInteger
    const reqHashGas: number[] = [];
    const resHashGas: number[] = [];
    const reqInfoGas: number[] = [];
    const resInfoGas: number[] = [];

    // Gas measurement arrays for StoreData
    const app2RelayGas: number[] = [];
    const pre2NextGas: number[] = [];
    const relay2AppGas: number[] = [];

    // Test values
    const hashTime = 600; // 10 minutes
    const numTime = 600; // 10 minutes

    before(async function () {
        // Get signers
        [deployer, requester, responder] = await ethers.getSigners();

        // Deploy the FairInteger contract
        const FairInteger = (await ethers.getContractFactory(
            'FairInteger'
        )) as FairInteger__factory;
        fairInteger = await FairInteger.deploy(hashTime, numTime);
        await fairInteger.deployed();
        console.log('FairInteger deployed to:', fairInteger.address);

        // Deploy the StoreData contract
        const StoreData = (await ethers.getContractFactory('StoreData')) as StoreData__factory;
        storeData = await StoreData.deploy();
        await storeData.deployed();
        console.log('StoreData deployed to:', storeData.address);

        // Generate public keys for account activation
        const reqWallet = ethers.Wallet.createRandom();
        const resWallet = ethers.Wallet.createRandom();

        // Connect the wallets to the provider
        const reqSigner = reqWallet.connect(ethers.provider);
        const resSigner = resWallet.connect(ethers.provider);

        // Fund accounts
        await deployer.sendTransaction({
            to: reqSigner.address,
            value: ethers.utils.parseEther('10'),
        });

        await deployer.sendTransaction({
            to: resSigner.address,
            value: ethers.utils.parseEther('10'),
        });

        // Activate accounts with properly formatted public keys
        // Use computePublicKey to get the uncompressed public key (with 0x04 prefix)
        const reqPublicKey = ethers.utils.computePublicKey(reqWallet.publicKey, false); // false = uncompressed
        const resPublicKey = ethers.utils.computePublicKey(resWallet.publicKey, false);

        // 使用正确格式的 bytes32 参数 (32字节的0)
        const emptyBytes32 = ethers.utils.hexZeroPad('0x', 32);

        await fairInteger.connect(reqSigner).activateAccount(emptyBytes32, reqPublicKey);
        await fairInteger.connect(resSigner).activateAccount(emptyBytes32, resPublicKey);
    });

    it(`Should measure FairInteger gas consumption over ${NUM_ITERATIONS} iterations`, async function () {
        console.log(`Starting FairInteger ${NUM_ITERATIONS} iteration gas test...`);

        for (let i = 0; i < NUM_ITERATIONS; i++) {
            if (i % 200 === 0) {
                console.log(`Progress: ${i}/${NUM_ITERATIONS}`);
            }

            // Generate random data for this iteration
            const reqNi = ethers.BigNumber.from(ethers.utils.randomBytes(32));
            const reqRi = ethers.BigNumber.from(ethers.utils.randomBytes(32));
            const resNi = ethers.BigNumber.from(ethers.utils.randomBytes(32));
            const resRi = ethers.BigNumber.from(ethers.utils.randomBytes(32));

            const reqHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['uint256', 'uint64', 'uint64', 'uint256'],
                    [reqNi, 0, 0, reqRi]
                )
            );

            const resHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['uint256', 'uint64', 'uint64', 'uint256'],
                    [resNi, 0, 0, resRi]
                )
            );

            // 1. Requester uploads hash
            let tx = await fairInteger.connect(requester).setReqHash(responder.address, reqHash);
            let receipt = await tx.wait();
            reqHashGas.push(receipt.gasUsed.toNumber());

            // 2. Responder uploads hash
            tx = await fairInteger.connect(responder).setResHash(requester.address, resHash);
            receipt = await tx.wait();
            resHashGas.push(receipt.gasUsed.toNumber());

            // 3. Requester uploads ni, ri
            tx = await fairInteger.connect(requester).setReqInfo(responder.address, reqNi, reqRi);
            receipt = await tx.wait();
            reqInfoGas.push(receipt.gasUsed.toNumber());

            // 4. Responder uploads ni, ri
            tx = await fairInteger.connect(responder).setResInfo(requester.address, resNi, resRi);
            receipt = await tx.wait();
            resInfoGas.push(receipt.gasUsed.toNumber());
        }

        // Print results
        console.log('\n======= FairInteger Gas Usage Statistics =======');
        console.log(`Total Iterations: ${NUM_ITERATIONS}`);

        console.log('\nRequester Hash Upload Gas:');
        const reqHashStats = printGasStats(reqHashGas);
        console.log(`  Average: ${reqHashStats.avg} gas`);
        console.log(`  Min: ${reqHashStats.min} gas`);
        console.log(`  Max: ${reqHashStats.max} gas`);

        console.log('\nResponder Hash Upload Gas:');
        const resHashStats = printGasStats(resHashGas);
        console.log(`  Average: ${resHashStats.avg} gas`);
        console.log(`  Min: ${resHashStats.min} gas`);
        console.log(`  Max: ${resHashStats.max} gas`);

        console.log('\nRequester Info Upload Gas:');
        const reqInfoStats = printGasStats(reqInfoGas);
        console.log(`  Average: ${reqInfoStats.avg} gas`);
        console.log(`  Min: ${reqInfoStats.min} gas`);
        console.log(`  Max: ${reqInfoStats.max} gas`);

        console.log('\nResponder Info Upload Gas:');
        const resInfoStats = printGasStats(resInfoGas);
        console.log(`  Average: ${resInfoStats.avg} gas`);
        console.log(`  Min: ${resInfoStats.min} gas`);
        console.log(`  Max: ${resInfoStats.max} gas`);

        console.log('\n======= FairInteger Total Gas Used =======');
        console.log(`Requester Total: ${reqHashStats.total + reqInfoStats.total} gas`);
        console.log(`Responder Total: ${resHashStats.total + resInfoStats.total} gas`);
        console.log(
            `Combined Total: ${
                reqHashStats.total + resHashStats.total + reqInfoStats.total + resInfoStats.total
            } gas`
        );
    });

    it(`Should measure StoreData gas consumption over ${NUM_ITERATIONS} iterations`, async function () {
        console.log(`\nStarting StoreData ${NUM_ITERATIONS} iteration gas test...`);

        for (let i = 0; i < NUM_ITERATIONS; i++) {
            if (i % 200 === 0) {
                console.log(`Progress: ${i}/${NUM_ITERATIONS}`);
            }

            // 1. Test app2Relay function
            let { app2RelayEncryptedData, dataHash, infoHash } = await getApp2RelayEncryptedData(
                0,
                2
            );

            let tx = await storeData
                .connect(requester)
                .setApp2Relay(responder.address, app2RelayEncryptedData, dataHash, infoHash);
            let receipt = await tx.wait();
            app2RelayGas.push(receipt.gasUsed.toNumber());

            // 2. Test pre2Next function
            const { encryptedPre2NextData, pre2NextDataHash, tokenHash } =
                await getPre2NextEncryptedData();

            tx = await storeData
                .connect(requester)
                .setPre2Next(responder.address, encryptedPre2NextData, tokenHash, pre2NextDataHash);
            receipt = await tx.wait();
            pre2NextGas.push(receipt.gasUsed.toNumber());

            // 3. Test relay2App function
            const {
                preApplicantTempAccount,
                encryptedData,
                relayDataHash,
                appTxHash,
                preRelayTxHash,
                infoHash: relayInfoHash,
            } = await getNextRelay2AppData();

            tx = await storeData
                .connect(responder)
                .setRelay2App(
                    preApplicantTempAccount,
                    encryptedData,
                    relayDataHash,
                    appTxHash,
                    preRelayTxHash,
                    relayInfoHash
                );
            receipt = await tx.wait();
            relay2AppGas.push(receipt.gasUsed.toNumber());
        }

        // Print results
        console.log('\n======= StoreData Gas Usage Statistics =======');
        console.log(`Total Iterations: ${NUM_ITERATIONS}`);

        console.log('\nApp2Relay Gas:');
        const app2RelayStats = printGasStats(app2RelayGas);
        console.log(`  Average: ${app2RelayStats.avg} gas`);
        console.log(`  Min: ${app2RelayStats.min} gas`);
        console.log(`  Max: ${app2RelayStats.max} gas`);

        console.log('\nPre2Next Gas:');
        const pre2NextStats = printGasStats(pre2NextGas);
        console.log(`  Average: ${pre2NextStats.avg} gas`);
        console.log(`  Min: ${pre2NextStats.min} gas`);
        console.log(`  Max: ${pre2NextStats.max} gas`);

        console.log('\nRelay2App Gas:');
        const relay2AppStats = printGasStats(relay2AppGas);
        console.log(`  Average: ${relay2AppStats.avg} gas`);
        console.log(`  Min: ${relay2AppStats.min} gas`);
        console.log(`  Max: ${relay2AppStats.max} gas`);

        console.log('\n======= StoreData Total Gas Used =======');
        console.log(`App2Relay Total: ${app2RelayStats.total} gas`);
        console.log(`Pre2Next Total: ${pre2NextStats.total} gas`);
        console.log(`Relay2App Total: ${relay2AppStats.total} gas`);
        console.log(
            `Combined Total: ${
                app2RelayStats.total + pre2NextStats.total + relay2AppStats.total
            } gas`
        );
    });
});
