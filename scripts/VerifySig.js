const hre = require('hardhat');

// npx hardhat run --network ganache .\scripts\VerifySig.js
async function main() {
    const VerifySig = await hre.ethers.getContractFactory('VerifySig');
    const verifySig = await VerifySig.deploy();

    await verifySig.deployed();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
