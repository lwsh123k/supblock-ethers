// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicKeyStorage {
	// 只存储实名用户的公钥
	mapping(address => bytes) public publicKeys;

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
}
