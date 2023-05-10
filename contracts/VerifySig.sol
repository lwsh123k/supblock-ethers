// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./EllipticCurve.sol";

// 验证签名
contract VerifySig {
	uint private constant p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
	uint private constant a = 0;
	uint private constant b = 7;
	uint private constant n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
	uint private constant Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
	uint private constant Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;

	//event verifyResult(bool result);

	// 去盲、验证
	function verifySig(
		string memory message,
		uint c,
		uint s,
		uint t,
		uint px,
		uint py
	) public pure returns (bool) {
		uint tempX;
		uint tempY;
		uint temp2X;
		uint temp2Y;

		// 验证c和m的hash
		s = s - t;
		(tempX, tempY) = EllipticCurve.ecMul(c, px, py, a, p);
		(temp2X, temp2Y) = EllipticCurve.ecMul(s, Gx, Gy, a, p);
		(tempX, ) = EllipticCurve.ecAdd(tempX, tempY, temp2X, temp2Y, a, p);
		tempX = tempX % n;
		string memory tempX_string = Strings.toString(tempX);
		uint result = uint(keccak256(abi.encodePacked(message, tempX_string)));
		bool isEqual = c == result;
		// emit verifyResult(isEqual);
		return isEqual;
	}
}
