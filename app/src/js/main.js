import sig from './fair-integer-sep';
import sigContract from './sigContract.js';
import { SocketModule } from './socket.js';
import tokenChain from './token-chain';
import auth from './auth.js';

const app = {
    init(socket) {
        this.socket = socket;
    },
    async joinRoom(privateKey) {
        // 连接钱包, 获得地址
        sigContract.setWallet(privateKey);
        sig.myAddress = sigContract.wallet.address;
        // 认证并加入socket
        let address = sigContract.getAddress(privateKey);
        let authString = await auth.getAuthString(address);
        let signedAuthString = await sigContract.getSign(authString, privateKey);
        this.socket.emit('join', { address, signedAuthString });
    },

    async fileCallBack() {
        const file = privateKeyFile.files[0];
        if (file) {
            const reader = new FileReader();
            // 异步读取, 读取完成后调用回调函数
            reader.readAsText(file);
            reader.onload = async (event) => {
                const fileContent = event.target.result;
                // 将内容按行分割成数组(\r: 回到行首; \n: new line)
                const lines = fileContent.split('\r\n');
                lines.pop();
                try {
                    if (lines.length > 2 && lines.length !== 102)
                        throw new Error('上传文件格式错误');
                    tokenChain.realNameAccount = lines[0];
                    tokenChain.anonymousAccount = lines[1];
                    tokenChain.tempAccount = lines.slice(2);
                    await this.joinRoom(tokenChain.realNameAccount);
                    await this.joinRoom(tokenChain.anonymousAccount);
                    tokenChain.tempAccount.forEach(async (item) => {
                        await this.joinRoom(item);
                    });
                    // 显示real name account
                    let addressSpan = document.getElementById('addressSpan');
                    addressSpan.innerText =
                        'real name account address:' + tokenChain.realNameAccount;
                } catch (e) {
                    console.log(e);
                }
            };
        }
    },
};

window.addEventListener('DOMContentLoaded', async () => {
    // 初始化
    let socket = new SocketModule().socket;
    sig.start(socket);
    tokenChain.init(socket);
    app.init(socket);
    sigContract.start();

    // 输入私钥(0x...), 连接钱包, 获得地址, 加入socket, 设置为ecc私钥
    document.querySelector('#getAddressButton').addEventListener('click', async function () {
        let privateKey = document.querySelector('#private_key').value;
        app.joinRoom(privateKey);
        // 显示real name account
        let addressSpan = document.getElementById('addressSpan');
        addressSpan.innerText = 'real name account address:' + this.myAddress;
    });

    // 请求者上传hash
    document.querySelector('#reqHashBtn').addEventListener('click', () => {
        let addressA = sigContract.wallet.address;
        let addressB = document.getElementById('receiver').value;
        sig.randomHashReq(addressA, addressB);
    });

    // 响应者上传hash
    document.querySelector('#resHashBtn').addEventListener('click', () => {
        let addressA = document.getElementById('receiver').value;
        let addressB = sigContract.wallet.address;
        sig.randomHashRes(addressA, addressB);
    });

    // 请求者上传ni和ri
    document.querySelector('#reqNumBtn').addEventListener('click', () => {
        let addressA = sigContract.wallet.address;
        let addressB = document.getElementById('receiver').value;
        let ni = document.getElementById('ni').value;
        let ri = document.getElementById('ri').value;
        sig.uploadNumReq(addressA, addressB, ni, ri);
    });

    // 响应者上传ni和ri
    document.querySelector('#resNumBtn').addEventListener('click', () => {
        let addressA = document.getElementById('receiver').value;
        let addressB = sigContract.wallet.address;
        let ni = document.getElementById('ni').value;
        let ri = document.getElementById('ri').value;
        sig.uploadNumRes(addressA, addressB, ni, ri);
    });

    // 显示选择的随机数
    document.querySelector('#showRandomBtn').addEventListener('click', () => {
        let sender = document.getElementById('verify-sender').value;
        let receiver = document.getElementById('verify-receiver').value;
        let index = document.getElementById('verify-index').value;
        sig.showRandom(sender, receiver, index);
    });

    // 通过文件读取私钥
    document
        .getElementById('privateKeyFile')
        .addEventListener('change', app.fileCallBack.bind(app));

    // 发送链初始化数据
    document.querySelector('#sendChainDataBtn').addEventListener('click', () => {
        sig.sendChainInitialData();
    });
});
