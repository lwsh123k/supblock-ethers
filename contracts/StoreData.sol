// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StoreData {
	// 只存储实名用户的公钥
	mapping(address => bytes) public publicKeys;
	// mapping(address => mapping(address => bytes[])) public relayData;

	// dataHash: 对数据整体取hash
	event App2RelayEvent(address indexed from, address indexed relay, bytes data, bytes32 dataHash);
	event Pre2NextEvent(
		address indexed from,
		address indexed relay,
		bytes data,
		bytes encryptedToken,
		bytes32 dataHash
	);
	// dataHash: 对数据整体取hash, 保证提供的加密数据是对的, 与App2RelayEvent中的相对应, relay对app请求的回应
	event RelayResEvidenceEvent(
		address indexed relayAnonymousAccount,
		address indexed appTempAccount,
		bytes data,
		bytes32 dataHash,
		bytes32 app2RelayResEvidence,
		bytes32 pre2NextResEvidence
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

	// set: pre applicant tempAccount-> relay anonymous account
	// 合约中的数据是公开的, 谁给relay发送了数据是公开的.
	// 能公开pre app temp和pre relay关系??  怎么去追溯??? 根据正向链追溯???
	// 不需要数组遍历的方式去对应pre app tempAccount和pre relay, pre app tempAccount和pre relay给relay发送的数据包含了他们之间的关系
	function setApp2Relay(address relay, bytes memory data, bytes32 dataHash) public {
		emit App2RelayEvent(msg.sender, relay, data, dataHash);
	}

	// set: pre relay anonymous account -> next relay anonymous account
	function setPre2Next(
		address relay,
		bytes memory data,
		bytes memory encryptedToken,
		bytes32 dataHash
	) public {
		// applicant为与pre relay对应的pre applicant tempAccount
		emit Pre2NextEvent(msg.sender, relay, data, encryptedToken, dataHash);
	}

	// relay对applicant和relay的回复, relay anonymous account -> pre applicant tempAccount
	function setRelay2App(
		address preAppTempAccount,
		bytes memory encryptedData,
		bytes32 dataHash,
		bytes32 app2RelayResEvidence,
		bytes32 pre2NextResEvidence
	) public {
		emit RelayResEvidenceEvent(
			msg.sender,
			preAppTempAccount,
			encryptedData,
			dataHash,
			app2RelayResEvidence,
			pre2NextResEvidence
		);
	}
}
