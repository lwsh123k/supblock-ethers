import { ethers } from 'ethers';
import ERC20ABI from "../../../artifacts/contracts/ERC20.sol/ERC20.json";

const App = {

    web3: null,
    account: null,
    ERC20: null,

    start: async function () {
        // 与以太坊进行交互的 ethers.js 实例
        const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545')
        const signer = provider.getSigner();
        
        // ERC20 合约地址和 ABI
        const contractAddress = "0x...";

        // 实例化合约对象
        const contract = new ethers.Contract(contractAddress, ERC20ABI, signer);

        // 获取用户地址并显示
        provider.getSigner().getAddress().then(userAddress => {
            document.getElementById("user-address").textContent = userAddress;
        });

        // 获取代币余额并显示
        contract.balanceOf(provider.getSigner().getAddress())
            .then(balance => {
                document.getElementById("balance").textContent = balance.toString();
            });

        // 获取总供应量并显示
        contract.totalSupply().then(totalSupply => {
            document.getElementById("total-supply").textContent = totalSupply.toString();
        });

    },

    // 转账函数
    transfer: async function (event) {
        event.preventDefault();
        const to = document.getElementById("transfer-to").value;
        const amount = document.getElementById("transfer-amount").value;
        const tx = await contract.transfer(to, ethers.utils.parseUnits(amount.toString()));
        await tx.wait();
        // 转账成功后更新余额
        const balance = await contract.balanceOf(provider.getSigner().getAddress());
        document.getElementById("balance").textContent = balance.toString();
    },

    // 授权函数
    approve: async function (event) {
        event.preventDefault();
        const spender = document.getElementById("approve-spender").value;
        const amount = document.getElementById("approve-amount").value;
        const tx = await contract.approve(spender, ethers.utils.parseUnits(amount.toString()));
        await tx.wait();
        // 授权成功后更新余额
        const allowance = await contract.allowance(provider.getSigner().getAddress(), spender);
        document.getElementById("balance").textContent = allowance.toString();
    }
}



window.App = App;
window.addEventListener('load', function () {
    if (window.ethereum) {
        // use ERC20Mask's provider
        App.web3 = new Web3(window.ethereum);
        window.ethereum.enable(); // get permission to access accounts
    } else {
        console.warn(
            "No web3 detected. Falling back to http://127.0.0.1:7545."
        );
        // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
        App.web3 = new Web3(
            new Web3.providers.HttpProvider("http://127.0.0.1:7545"),
        );
    }

    App.start();
})