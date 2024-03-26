import { ethers } from 'ethers';
let url = 'https://eth-mainnet.g.alchemy.com/v2/MWK68EVQmi3BlgdoDm9WD6Dpz2a143xC';

const provider = new ethers.providers.JsonRpcProvider(url);
const main = async () => {
    const balance = await provider.getBalance(`vitalik.eth`);
    console.log(`ETH Balance of vitalik: ${ethers.utils.formatEther(balance)} ETH`);
};
main();
