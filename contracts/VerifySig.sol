// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./EllipticCurve.sol";
import "./SigInfo.sol";

// 验证签名继承SigInfo函数，可以访问存储的签名信息变量
contract VerifySig is SigInfo {
	// p为有限域的阶
	uint private constant p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F;
	uint private constant a = 0;
	uint private constant b = 7;
	uint private constant n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;
	uint private constant Gx = 0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798;
	uint private constant Gy = 0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8;

	struct VerifyInfo {
		address sender;
		address receiver;
		string message;
		uint c;
		uint deblind;
		uint s;
		uint t;
		uint px;
		uint py;
	}

	// 去盲、验证
	function verifySig(VerifyInfo memory info) public view returns (string memory) {
		uint tempX;
		uint tempY;
		uint temp2X;
		uint temp2Y;
		info.px = uint(SigPubKey[info.receiver].pkx);
		info.py = uint(SigPubKey[info.receiver].pky);

		// 数据一致性验证:如果数据不一致，直接返回false
		if (!verifyconsistency(info)) return "false data";

		//去盲,考虑s + deblind是否超出uint256的最大值
		// if (s + deblind <= s) {
		// 	s = (s + deblind) % n;
		// 	s = ((s + (maxUint % n)) % n) + 1;
		// } else {
		// 	s = (s + deblind) % n;
		// }
		info.s = addmod(info.s, info.deblind, n); // 使用内置函数
		console.log("s:", info.s);
		// 去除随机数t: s = (s - t)%n,考虑结果小于0的情况(此处为mod n, 不是mod 2^256)
		// s = (n - t + s) mod n   (此处t <= n)
		unchecked {
			info.s = n - info.t + info.s;
		}
		console.log("s:", info.s);
		// 验证签名
		(tempX, tempY) = EllipticCurve.ecMul(info.c, info.px, info.py, a, p);
		(temp2X, temp2Y) = EllipticCurve.ecMul(info.s, Gx, Gy, a, p);
		(tempX, ) = EllipticCurve.ecAdd(tempX, tempY, temp2X, temp2Y, a, p);
		tempX = tempX % n;
		string memory tempX_string = Strings.toString(tempX);
		uint result = uint(keccak256(abi.encodePacked(info.message, tempX_string)));
		if (info.c == result) return "true signature";
		else return "false signature";
	}

	// 验证数据是否和链上存储一致
	function verifyconsistency(VerifyInfo memory info) internal view returns (bool) {
		bytes32 sigHash = keccak256(
			abi.encode(
				info.c,
				keccak256(abi.encodePacked(info.deblind)),
				keccak256(abi.encodePacked(info.message)),
				info.s,
				info.t,
				info.px,
				info.py,
				info.sender,
				info.receiver
			)
		);
		bytes32 dehash = keccak256(abi.encodePacked(info.message));
		console.logBytes32(dehash);
		console.logBytes32(sigHash);
		if (SigIndex[sigHash] == 0) return false;
		return true;
	}
}
