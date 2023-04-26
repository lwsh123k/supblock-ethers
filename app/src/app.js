import dataContractABI from '../../build/contracts/UserInfo.json'

const web3 = new Web3('127.0.0.1:7545');

// const dataContractABI = []; // 合约ABI
const dataContractAddress = '0xe971797A3DB319c37D6a7Bb26362921a3008a0fD'; // 合约地址

const dataContract = new web3.eth.Contract(dataContractABI, dataContractAddress);

function setData() {
  const inputData = document.getElementById('dataInput').value;

  // 发送交易将数据保存到智能合约中
  dataContract.methods.setData(inputData).send({
    from: web3.eth.defaultAccount,
    gas: 200000
  })
  .on('receipt', receipt => {
    console.log('Transaction receipt:', receipt);
    document.getElementById('result').innerHTML = 'Transaction hash: ' + receipt.transactionHash;
  })
  .on('error', error => {
    console.error('Error sending transaction:', error);
    document.getElementById('result').innerHTML = 'Error sending transaction: ' + error.message;
  });
}
