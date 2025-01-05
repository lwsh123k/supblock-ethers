// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StoreData {
	// 只存储实名用户的公钥
	mapping(address => bytes) public publicKeys;
	// mapping(address => mapping(address => bytes[])) public relayData;

	// 记录 app2RelayResEvidence 与 pre2NextResEvidence 组合的唯一性
	mapping(bytes32 => bool) public usedEvidence;

	// dataHash: 对数据整体取hash; infoHash: 与公平随机数中的infoHash一一对应
	event App2RelayEvent(
		address indexed from,
		address indexed relay,
		bytes data,
		bytes32 dataHash,
		bytes32 infoHash
	);
	// encryptedToken, 错误数据验证
	event Pre2NextEvent(
		address indexed from,
		address indexed relay,
		bytes data,
		bytes32 tokenHash,
		bytes32 dataHash
	);
	// dataHash: 对数据整体取hash, 保证提供的加密数据是对的, 与App2RelayEvent中的info hash, data hash相对应, 与Pre2NextEvent中的data hash对应, relay对app请求的回应
	event RelayResEvidenceEvent(
		address indexed relayAnonymousAccount,
		address indexed appTempAccount,
		bytes data,
		bytes32 dataHash,
		bytes32 app2RelayResEvidence,
		bytes32 pre2NextResEvidence,
		bytes32 infoHash
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
	function setApp2Relay(
		address relay,
		bytes memory data,
		bytes32 dataHash,
		bytes32 infoHash
	) public {
		emit App2RelayEvent(msg.sender, relay, data, dataHash, infoHash);
	}

	// set: pre relay anonymous account -> next relay anonymous account
	function setPre2Next(
		address relay,
		bytes memory data,
		bytes32 tokenHash,
		bytes32 dataHash
	) public {
		// applicant为与pre relay对应的pre applicant tempAccount
		emit Pre2NextEvent(msg.sender, relay, data, tokenHash, dataHash);
	}

	// relay对applicant和relay的回复, relay anonymous account -> pre applicant tempAccount
	function setRelay2App(
		address preAppTempAccount,
		bytes memory encryptedData,
		bytes32 dataHash,
		bytes32 app2RelayResEvidence,
		bytes32 pre2NextResEvidence,
		bytes32 infoHash
	) public {
		// 1. 将 app2RelayResEvidence 与 pre2NextResEvidence 进行哈希运算
		bytes32 combinedHash = keccak256(
			abi.encodePacked(app2RelayResEvidence, pre2NextResEvidence)
		);

		// 2. 判断该组合是否已经被使用过
		require(!usedEvidence[combinedHash], "Evidence pair already used");

		// 3. 标记该组合已被使用
		usedEvidence[combinedHash] = true;

		// 4. 触发事件
		emit RelayResEvidenceEvent(
			msg.sender,
			preAppTempAccount,
			encryptedData,
			dataHash,
			app2RelayResEvidence,
			pre2NextResEvidence,
			infoHash
		);
	}
}
