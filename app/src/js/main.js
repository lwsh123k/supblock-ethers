import sig from './fair-integer-sep';
import sigContract from './sigContract.js';

window.addEventListener('DOMContentLoaded', async () => {
    // 初始化
    sig.start();
    sigContract.start();

    // 输入私钥获得地址，连接钱包、设置为ecc的私钥(地址和私钥统一带0x前缀)
    document.querySelector('#getAddressButton').addEventListener('click', async function () {
        // 为wallet、ecc设置私钥
        let private_key = document.querySelector('#private_key').value;
        sig.keyConversion(private_key);
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
    document.getElementById('privateKeyFile').addEventListener(
        'change',
        function () {
            const file = privateKeyFile.files[0]; // 获取用户选择的文件

            if (file) {
                const reader = new FileReader();
                // 读取完成
                reader.onload = (event) => {
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
                        this.keyConversion(tokenChain.realNameAccount);
                    } catch (e) {
                        console.log(e);
                    }
                };
                // 读取
                reader.readAsText(file);
            }
        }.bind(sig)
    );

    // 发送链初始化数据
    document.querySelector('#sendChainDataBtn').addEventListener('click', () => {
        sig.sendChainInitialData();
    });
});
