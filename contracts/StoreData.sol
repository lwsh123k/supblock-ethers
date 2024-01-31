// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StoreData {
	// 只存储实名用户的公钥
	mapping(address => bytes) public publicKeys;
	mapping(address => mapping(address => bytes[])) public relayData;

	event storeDataEvent(address indexed from, address indexed to, bytes data);

	// 存储公钥
	function setPublicKey(bytes memory publicKey) public {
		bytes32 hashBytes = keccak256(abi.encodePacked(publicKey));
		address addr = address(uint160(uint256(hashBytes)));
		require(addr == msg.sender, "address can not derive from public key");
		publicKeys[msg.sender] = publicKey;
	}

	// 获取公钥
	function getPublicKey(address user) public view returns (bytes memory) {
		return publicKeys[user];
	}

	// 存储数据到区块链: 只能添加不能更改以前的数据
	// set: applicant -> relay
	function setData(address receiver, bytes memory data) public {
		relayData[msg.sender][receiver].push(data);
		emit storeDataEvent(msg.sender, receiver, data);
	}

	// get: applicant -> relay. index从0开始计数
	// 此处index应由applicant保存, 或者mapping(data hash -> index)
	function getData(
		address sender,
		address receiver,
		uint index
	) public view returns (bytes memory) {
		require(index <= relayData[sender][receiver].length, "invalid index");
		return relayData[sender][receiver][index];
	}
}
