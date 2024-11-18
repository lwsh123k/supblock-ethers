// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 存储数据是存储到数组之类的变量中, 还是存储到事件中, 由程序捕获??
contract StoreData {
	// 只存储实名用户的公钥
	mapping(address => bytes) public publicKeys;
	mapping(address => mapping(address => bytes[])) public relayData;

	// dataHash: 对数据整体取hash, 保证提供的加密数据是对的
	event App2RelayEvent(
		address indexed from,
		address indexed relay,
		bytes data,
		bytes32 dataHash,
		uint dataIndex,
		bool lastRelay
	);
	event Pre2NextEvent(address indexed from, address indexed relay, bytes data, uint dataIndex);
	// dataHash: 对数据整体取hash, 保证提供的加密数据是对的, 与App2RelayEvent中的相对应, relay对app请求的回应
	event RelayResEvidenceEvent(
		address indexed relayRealAccount,
		address indexed appTempAccount,
		bytes data,
		bytes32 dataHash,
		uint8 chainIndex
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

	// set: pre applicant tempAccount-> relay
	// 合约中的数据是公开的, 谁给relay发送了数据是公开的.
	// 能公开pre app temp和pre relay关系??  怎么去追溯??? 根据正向链追溯???
	// 不需要数组遍历的方式去对应pre app tempAccount和pre relay, pre app tempAccount和pre relay给relay发送的数据包含了他们之间的关系
	function setApp2Relay(
		address relay,
		bytes memory data,
		bytes32 dataHash,
		bool lastRelay
	) public {
		relayData[msg.sender][relay].push(data);
		emit App2RelayEvent(
			msg.sender,
			relay,
			data,
			dataHash,
			relayData[msg.sender][relay].length - 1,
			lastRelay // true only when app sends to last user relay
		);
	}

	// set: pre relay -> next
	function setPre2Next(address relay, bytes memory data) public {
		relayData[msg.sender][relay].push(data);
		// applicant为与pre relay对应的pre applicant tempAccount
		emit Pre2NextEvent(msg.sender, relay, data, relayData[msg.sender][relay].length - 1);
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

	// relay给applicant的回复, relayRealAccount -> appTempAccount
	// 如果只上链hash, 会不会将hash上链, 但是实际上并没有将消息发回给applicant
	function setTempAccountHash(
		address appTempAccount,
		bytes memory encryptedData,
		bytes32 dataHash,
		uint8 chainIndex
	) public {
		emit RelayResEvidenceEvent(msg.sender, appTempAccount, encryptedData, dataHash, chainIndex);
	}
}
