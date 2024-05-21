// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 存储数据是存储到数组之类的变量中, 还是存储到事件中, 由程序捕获??
contract StoreData {
	// 只存储实名用户的公钥
	mapping(address => bytes) public publicKeys;
	mapping(address => mapping(address => bytes[])) public relayData;

	event App2RelayEvent(
		address indexed applicant,
		address indexed preRelay,
		address indexed relay,
		bytes data,
		uint dataIndex
	);
	event Pre2NextEvent(
		address indexed applicant,
		address indexed preRelay,
		address indexed relay,
		bytes data,
		uint dataIndex
	);

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

	// 具体的数据存储到数组, applicant, pre relay, relay之间的关系存储到event
	// set: applicant -> relay
	function setApp2Relay(address preRelay, address relay, bytes memory data) public {
		relayData[msg.sender][relay].push(data);
		emit App2RelayEvent(
			msg.sender,
			preRelay,
			relay,
			data,
			relayData[msg.sender][relay].length - 1
		);
	}

	// set: pre -> next
	function setPre2Next(address applicant, address relay, bytes memory data) public {
		relayData[msg.sender][relay].push(data);
		emit Pre2NextEvent(
			applicant,
			msg.sender,
			relay,
			data,
			relayData[msg.sender][relay].length - 1
		);
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
