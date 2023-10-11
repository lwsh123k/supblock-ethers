// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicKeyStorage {
	// 只存储实名用户的公钥
	mapping(address => bytes) public publicKeys;

	mapping(address => mapping(address => bytes[])) public App2RelayData;
	mapping(address => mapping(address => bytes[])) public Data2NextRelay;

	event App2RelayDataEvent(address indexed from, address indexed to, bytes data);
	event Data2NextRelayEvent(address indexed from, address indexed to, bytes data);

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
	function setApp2RelayData(address receiver, bytes memory data) public {
		App2RelayData[msg.sender][receiver].push(data);
		emit App2RelayDataEvent(msg.sender, receiver, data);
	}

	// get: applicant -> relay. index从0开始计数
	// 此处index应由applicant保存, 或者mapping(data hash -> index)
	function getApp2RelayData(
		address sender,
		address receiver,
		uint index
	) public view returns (bytes memory) {
		require(index <= App2RelayData[sender][receiver].length, "invalid index");
		return App2RelayData[sender][receiver][index];
	}

	// relay to next relay
	function setData2NextRelay(address receiver, bytes memory data) public {
		Data2NextRelay[msg.sender][receiver].push(data);
		emit Data2NextRelayEvent(msg.sender, receiver, data);
	}

	function getData2NextRelay(
		address sender,
		address receiver,
		uint index
	) public view returns (bytes memory) {
		require(index <= Data2NextRelay[sender][receiver].length, "invalid index");
		return Data2NextRelay[sender][receiver][index];
	}
}
