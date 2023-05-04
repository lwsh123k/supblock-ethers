import { ethers } from 'ethers';
import '../style/myToken.css';

const app = {
    // 创建 Web3Provider 对象
    provider: null,
    wallet: null,
    singerContract: null,
    // 获取 ERC20 合约对象
    contractAddress: '0xe9224A2CAc243d763D8B5ee7B4e12D269edce7D6', // ERC20 合约地址
    abi: [
        'constructor(string memory name_, string memory symbol_)',
        'event Transfer(address indexed from, address indexed to, uint256 value)',
        'event Approval(address indexed owner, address indexed spender, uint256 value)',
        'function totalSupply() external view returns (uint256)',
        'function balanceOf(address account) external view returns (uint256)',
        'function transfer(address to, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) external view returns (uint256)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
    ],
    contract: null,

    // 初始化变量、查询
    async start() {
        if (window.ethereum) this.provider = new ethers.providers.Web3Provider(window.ethereum);
        else this.provider = new ethers.providers.JsonRpcProvider('http://localhost:7545');

        this.contract = new ethers.Contract(this.contractAddress, this.abi, this.provider);
        // 更新用户信息
        // await app.updateAccount();
        // await app.updateBalance();
    },

    // 获取wallet类
    getWallet() {
        let private_key = document.querySelector('#private_key').value;
        this.wallet = new ethers.Wallet(private_key, this.provider);
        this.singerContract = this.contract.connect(this.wallet);
    },
    // 更新用户信息
    async updateAccount() {
        // 获得私钥对应的地址
        const address = this.wallet.address;
        document.getElementById('user-address').innerHTML = address;
        console.log(address);
    },

    // 更新余额和总供应量
    async updateBalance() {
        // 获取账户余额和总供应量
        const balance = await this.contract.balanceOf(this.wallet.address);
        // 单位格式化，balance / 10^18
        document.getElementById('balance').innerHTML = ethers.utils.formatUnits(balance, 18);
        const totalSupply = await this.contract.totalSupply();
        document.getElementById('total-supply').innerHTML = ethers.utils.formatUnits(
            totalSupply,
            18
        );
    },

    // 转账函数
    async transfer(event) {
        event.preventDefault(); // 阻止表单默认行为
        const to = document.getElementById('transfer-to').value;
        const amount = document.getElementById('transfer-amount').value;
        const tx = await this.singerContract.transfer(
            to,
            ethers.utils.parseUnits(amount.toString())
        );
        await tx.wait();
        // 转账成功后更新余额
        await this.updateBalance();
    },

    // 授权函数
    async approve(event) {
        event.preventDefault();
        const spender = document.getElementById('approve-spender').value;
        const amount = document.getElementById('approve-amount').value;
        const tx = await this.contract.approve(spender, ethers.utils.parseUnits(amount.toString()));
        await tx.wait();
    },
};

// 在DOM加载完成后初始化应用程序
window.addEventListener('DOMContentLoaded', async () => {
    // 初始化
    app.start();

    // 监听账户变化事件
    app.provider.on('accountsChanged', async () => {
        await app.updateAccount();
        await app.updateBalance();
    });

    // 监听网络变化事件
    app.provider.on('networkChanged', async () => {
        await app.updateAccount();
        await app.updateBalance();
    });

    //  输入私钥获得地址和余额事件
    document.querySelector('#getAddressButton').addEventListener('click', async () => {
        app.getWallet();
        await app.updateAccount();
        await app.updateBalance();
    });
    // 监听转账表单提交事件
    document.querySelector('#transfer-form').addEventListener('submit', async (event) => {
        await app.transfer(event);
    });

    // 监听授权表单提交事件
    document.querySelector('#approve-form').addEventListener('submit', async (event) => {
        await app.approve(event);
    });

    setTimeout(function () {
        console.log('hahha');
    }, 2000);
});
