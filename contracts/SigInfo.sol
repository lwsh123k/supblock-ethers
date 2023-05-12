// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract SigInfo {
	struct Info {
		bytes32 c; // c只是在验证签名时使用
		bytes32 deblindHash; // 去盲时用到的数的hash
		bytes32 mHash;
		uint reqTimestamp;
		bytes32 s;
		bytes32 t;
		uint resTimestamp;
	}

	// 签名方的公钥,因为公钥是不变的，可以增加mapping保存映射，而不是每次签名都保存
	struct publicKey {
		bytes32 pkx;
		bytes32 pky;
	}

	// 不会发生伪造
	// 为了方便验证数据与链上的是否一致,增加一个映射：签名hash => SigInfo数组下标
	// 因为mapping对于不存在的映射返回0，所以下标在原来的基础上增加1
	mapping(address => mapping(address => Info[])) public Sig;
	mapping(bytes32 => uint) public SigIndex;
	mapping(address => publicKey) public SigPubKey;

	// 请求签名的set
	function setRequestSig(address receiver, bytes32 c, bytes32 deblindHash, bytes32 mHash) public {
		Info memory reqInfo;
		reqInfo.c = c;
		reqInfo.deblindHash = deblindHash;
		reqInfo.mHash = mHash;
		reqInfo.reqTimestamp = block.timestamp;
		Sig[msg.sender][receiver].push(reqInfo);
	}

	// 响应签名的set
	function setResponseSig(address sender, bytes32 s, bytes32 t, bytes32 pkx, bytes32 pky) public {
		uint len = Sig[sender][msg.sender].length;
		if (len == 0) revert("empty array"); // 数组中没有元素,revert
		// 获取最后一个签名,如果先响应后请求,根据响应的时间戳字段判断
		Info storage resInfo = Sig[sender][msg.sender][len - 1];
		if (resInfo.resTimestamp != 0) revert("wrong order");
		resInfo.s = s;
		resInfo.t = t;
		// resInfo.pkx = pkx;
		// resInfo.pky = pky;
		resInfo.resTimestamp = block.timestamp;

		// 没有设置过公钥需要设置公钥
		if (SigPubKey[msg.sender].pkx == bytes32(0) && SigPubKey[msg.sender].pky == bytes32(0)) {
			// 验证公钥的正确性
			address pkToAddress = address(uint160(uint256(keccak256(abi.encodePacked(pkx, pky)))));
			if (pkToAddress == msg.sender) {
				SigPubKey[msg.sender].pkx = pkx;
				SigPubKey[msg.sender].pky = pky;
			} else revert("error public key");
		}

		// 求签名hash，hash不包括时间戳，这里的sender是请求签名的人
		bytes32 sigHash = keccak256(
			abi.encode(
				resInfo.c,
				resInfo.deblindHash,
				resInfo.mHash,
				s,
				t,
				pkx,
				pky,
				sender,
				msg.sender
			)
		);
		console.logBytes32(sigHash);
		require(SigIndex[sigHash] == 0, "sig exists");
		SigIndex[sigHash] = len;
	}

	// 得到第index(0 1 2 3 ... len-1)次签名get
	function getSig(address receiver, uint index) public view returns (Info memory) {
		uint len = Sig[msg.sender][receiver].length;
		if (index < 0 || index >= len) revert("serial number error");
		return Sig[msg.sender][receiver][index];
	}

	// 得到所有签名get
	function getAllSigs(address receiver) public view returns (Info[] memory) {
		return Sig[msg.sender][receiver];
	}
}
