// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract PkToAddress {
	// 计算hash时，不需要加0x04前缀
	function publicKeyToAddress(bytes32 pkx, bytes32 pky) public pure returns (address) {
		bytes32 hashBytes = keccak256(abi.encodePacked(pkx, pky));
		address addr = address(uint160(uint256(hashBytes)));
		return addr;
	}
}
