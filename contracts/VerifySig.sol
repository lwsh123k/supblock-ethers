// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./EllipticCurve.sol";
import "./SigInfo.sol";

// 验证签名继承SigInfo函数，可以访问存储的签名信息变量
contract VerifySig is SigInfo {
	uint private constant p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
	uint private constant a = 0;
	uint private constant b = 7;
	uint private constant n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
	uint private constant Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
	uint private constant Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;
	uint256 private constant maxUint = 2 ** 256 - 1;

	//event verifyResult(bool result);

	// 去盲、验证
	function verifySig(
		address receiver,
		string memory message,
		uint c,
		uint deblind,
		uint s,
		uint t,
		uint px,
		uint py
	) public view returns (bool) {
		uint tempX;
		uint tempY;
		uint temp2X;
		uint temp2Y;

		// 验证数据与链上数据是否一致
		bytes32 deblindHash = keccak256(abi.encodePacked(deblind));
		bytes32 mHash = keccak256(abi.encodePacked(message));
		bytes32 sigHash = keccak256(
			abi.encode(c, deblindHash, mHash, s, t, px, py, receiver, msg.sender)
		);
		if (SigIndex[sigHash] == 0) return false;

		//去盲,考虑s + deblind是否超出uint256的最大值
		if (s + deblind <= s) {
			s = (s + deblind) % n;
			s = ((s + (maxUint % n)) % n) + 1;
		} else {
			s = (s + deblind) % n;
		}

		// 去除随机数t: s = s - t,考虑结果小于0的情况
		// s = (2^256 - t + s) mod 2^256
		s = maxUint - t + s + 1;

		// 验证签名
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
