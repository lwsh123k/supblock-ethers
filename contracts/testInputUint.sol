// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// 在remix中输入address和uint的方式
// 0x66724EEaCaA925441b591008aD3C58CAf0AAeA88, 0xe67b5ac2f51d6b4a7678f68aab798ddba036e347393eb107548d48e89401bfc0
// 或者 0x66724EEaCaA925441b591008aD3C58CAf0AAeA88, 10
contract TestUint {
	bytes32 public hashOfPk;
	bytes public hashhh;

	function publicKeyToAddress(address addr, uint t) public pure returns (address) {
		t = 5;
		return addr;
	}
}
