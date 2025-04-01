// gas-test.js
import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

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

// npx hardhat test test/gas-test.ts
describe('FairInteger Gas Optimization Test', function () {
    // Increase timeout for long-running tests
    this.timeout(600000);

    let fairInteger: Contract;
    let deployer: SignerWithAddress, requester: SignerWithAddress, responder: SignerWithAddress;
    const NUM_ITERATIONS = 1000;

    // Gas measurement arrays
    const reqHashGas: number[] = [];
    const resHashGas: number[] = [];
    const reqInfoGas: number[] = [];
    const resInfoGas: number[] = [];

    // Test values
    const hashTime = 600; // 10 minutes
    const numTime = 600; // 10 minutes

    before(async function () {
        // Get signers
        [deployer, requester, responder] = await ethers.getSigners();

        // Deploy the contract
        const FairInteger = await ethers.getContractFactory('FairIntegerV0');
        fairInteger = await FairInteger.deploy(hashTime, numTime);
        await fairInteger.deployed();
        console.log('FairInteger deployed to:', fairInteger.address);

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

    it(`Should measure gas consumption over ${NUM_ITERATIONS} iterations`, async function () {
        console.log(`Starting ${NUM_ITERATIONS} iteration gas test...`);

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
        console.log('\n======= Gas Usage Statistics =======');
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

        console.log('\n======= Total Gas Used =======');
        console.log(`Requester Total: ${reqHashStats.total + reqInfoStats.total} gas`);
        console.log(`Responder Total: ${resHashStats.total + resInfoStats.total} gas`);
        console.log(
            `Combined Total: ${
                reqHashStats.total + resHashStats.total + reqInfoStats.total + resInfoStats.total
            } gas`
        );

        // Export data to CSV for further analysis
        // console.log('\nIteration,ReqHash,ResHash,ReqInfo,ResInfo');
        // for (let i = 0; i < NUM_ITERATIONS; i++) {
        //     console.log(
        //         `${i + 1},${reqHashGas[i]},${resHashGas[i]},${reqInfoGas[i]},${resInfoGas[i]}`
        //     );
        // }
    });
});
