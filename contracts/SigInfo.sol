// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract SigInfo {
	struct Info {
		bytes32 cHash;
		bytes32 mHash;
		uint reqTimestamp;
		bytes32 s;
		bytes32 t;
		uint resTimestamp;
	}

	// 不会发生伪造
	mapping(address => mapping(address => Info[])) public Sig;

	// 请求签名的set
	function setRequestSig(address receiver, bytes32 cHash, bytes32 mHash) public {
		Info memory reqInfo;
		reqInfo.cHash = cHash;
		reqInfo.mHash = mHash;
		reqInfo.reqTimestamp = block.timestamp;
		Sig[msg.sender][receiver].push(reqInfo);
	}

	// 响应签名的set
	function setResponseSig(address receiver, bytes32 s, bytes32 t) public {
		uint len = Sig[receiver][msg.sender].length;
		if (len == 0) revert("empty array"); // 数组中没有元素,revert
		// 获取最后一个签名,如果先响应后请求,revert
		Info storage resInfo = Sig[receiver][msg.sender][len - 1];
		if (resInfo.resTimestamp != 0) revert("wrong order");
		resInfo.s = s;
		resInfo.t = t;
		resInfo.resTimestamp = block.timestamp;
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
