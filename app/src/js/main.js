import FairInteger from './fair-integer-sep';
import sigContract from './contract-interaction/fair-integer-contract.js';
import storeMsgContract from './contract-interaction/strore-msg-contract';
import { SharedConnector } from './shared-connector.js';
import tokenChain from './token-chain';
import networkRequest from './network-request.js';

const app = {
    init(socket) {
        this.socket = socket;
    },

    // 通过签名认证并加入socket
    async joinRoom(privateKey) {
        let address = sigContract.getAddress(privateKey);
        let authString = await networkRequest.getAuthString(address);
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
                    let realNameAccountKey = lines[0];
                    let anonymousAccountKey = lines[1];
                    let tempAccountKey = lines.slice(2);
                    // 同时保留账户的key 和 address
                    // 处理real name account key, 对于validator， real name accout = anonymous account
                    await this.joinRoom(realNameAccountKey);
                    tokenChain.accounts.push({
                        key: realNameAccountKey,
                        address: sigContract.getAddress(realNameAccountKey),
                    });
                    if (!anonymousAccountKey)
                        tokenChain.accounts.push({
                            key: realNameAccountKey,
                            address: sigContract.getAddress(realNameAccountKey),
                        });
                    // 处理anonymous account key
                    if (anonymousAccountKey) {
                        await this.joinRoom(anonymousAccountKey);
                        tokenChain.accounts.push({
                            key: anonymousAccountKey,
                            address: sigContract.getAddress(anonymousAccountKey),
                        });
                    }
                    // 处理temp account key, 计算链初始化数据
                    if (tempAccountKey.length > 0) {
                        for (let item of tempAccountKey) {
                            await this.joinRoom(item);
                            tokenChain.tempAccount.push({
                                key: item,
                                address: sigContract.getAddress(item),
                            });
                        }
                        tokenChain.computeInitialData();
                    }
                    // 展示address
                    let addressSpan = document.getElementById('addressSpan');
                    addressSpan.innerText = `实名:  ${tokenChain.accounts[0].address}\n`;
                    if (anonymousAccountKey)
                        addressSpan.innerText += `匿名: ${tokenChain.accounts[1].address}\n`;
                    if (tempAccountKey.length > 0) {
                        addressSpan.innerText += `临时: `;
                        tokenChain.selectedTempAccount.forEach((item) => {
                            addressSpan.innerText += `      ${item.address} \n`;
                        });
                    }

                    // 开启监听
                    tokenChain.listenAppData();
                    tokenChain.listenPreRelayData();
                } catch (e) {
                    console.log(e);
                }
            };
        }
    },
};

window.addEventListener('DOMContentLoaded', async () => {
    // 初始化
    let sharedConnector = new SharedConnector();
    let socket = sharedConnector.getSocket('http://localhost:3000');
    let provider = sharedConnector.getProvider('http://localhost:8545');
    tokenChain.init(socket, provider);
    app.init(socket);

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
        let addressB = document.getElementById('receiver').value;
        tokenChain.reqUploadHash(addressB);
    });

    // 响应者上传hash
    document.querySelector('#resHashBtn').addEventListener('click', () => {
        let addressA = document.getElementById('receiver').value;
        tokenChain.resUploadHash(addressA);
    });

    // 请求者上传ni和ri
    // document.querySelector('#reqNumBtn').addEventListener('click', () => {
    //     let addressB = document.getElementById('receiver').value;
    //     let ni = document.getElementById('ni').value;
    //     let ri = document.getElementById('ri').value;
    //     tokenChain.reqUploadNum(addressB, ni, ri);
    // });

    // 响应者上传ni和ri
    // document.querySelector('#resNumBtn').addEventListener('click', () => {
    //     let addressA = document.getElementById('receiver').value;
    //     let ni = document.getElementById('ni').value;
    //     let ri = document.getElementById('ri').value;
    //     tokenChain.resUploadNum(addressA, ni, ri);
    // });

    // 显示选择的随机数
    document.querySelector('#showRandomBtn').addEventListener('click', () => {
        let sender = document.getElementById('verify-sender').value;
        let receiver = document.getElementById('verify-receiver').value;
        let index = document.getElementById('verify-index').value;
        tokenChain.FairInteger.showRandom(sender, receiver, index);
    });

    // 通过文件读取私钥
    document
        .getElementById('privateKeyFile')
        .addEventListener('change', app.fileCallBack.bind(app));

    // 发送链初始化数据
    document.querySelector('#sendChainDataBtn').addEventListener('click', () => {
        tokenChain.sendInitialData();
    });
});
