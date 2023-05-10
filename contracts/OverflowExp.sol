// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract C {
	function test() public pure returns (uint) {
		uint8 x = 255;
		x += 10;
		return x;
	}
}
// output: uint256: 9
