import { ethers } from 'hardhat';

async function main() {
    let fileName = 'FairInteger';
    const jsonAbi = require(`../artifacts/contracts/${fileName}.sol/${fileName}.json`).abi;

    const iface = new ethers.utils.Interface(jsonAbi);
    console.log(iface.format(ethers.utils.FormatTypes.full));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
