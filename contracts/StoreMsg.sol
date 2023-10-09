// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicKeyStorage {
	mapping(address => bytes) public publicKeyHashes;

	// 存储公钥哈希
	function storePublicKeyHash(bytes memory publicKeyHash) public {
		publicKeyHashes[msg.sender] = publicKeyHash;
	}

	// 验证提供的公钥是否与地址匹配
	function verifyPublicKey(bytes memory publicKey) public view returns (bool) {
		bytes memory storedPublicKeyHash = publicKeyHashes[msg.sender];
		bytes32 providedPublicKeyHash = keccak256(publicKey);

		return (keccak256(storedPublicKeyHash) == providedPublicKeyHash);
	}
}
