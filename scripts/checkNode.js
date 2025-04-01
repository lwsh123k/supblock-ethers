const { ethers } = require('ethers');

async function waitForNode() {
    // ethers v5 语法
    const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
    let attempts = 30;

    while (attempts > 0) {
        try {
            await provider.getNetwork();
            console.log('Node is ready!');
            process.exit(0);
        } catch (error) {
            attempts--;
            if (attempts === 0) {
                console.error('Node failed to start');
                process.exit(1);
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}

waitForNode();
