// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract SigInfo_1 {
	struct ReqInfo {
		bytes32 cHash;
		bytes32 mHash;
		uint reqTimestamp;
	}
	struct ResInfo {
		bytes32 s;
		bytes32 t;
		uint resTimestamp;
	}
	// 如果只用一个mapping，任何人都可以通过set伪造响应的签名 ××××××××（错误）
	mapping(address => mapping(address => ReqInfo[])) public RequestSig;
	mapping(address => mapping(address => ResInfo[])) public ResponseSig;

	// 请求签名的get和set
	function setRequestSig(address receiver, bytes32 cHash, bytes32 mHash) public {
		RequestSig[msg.sender][receiver].push(
			ReqInfo({ cHash: cHash, mHash: mHash, reqTimestamp: block.timestamp })
		);
	}

	function getRequestSig(address receiver, uint index) public view returns (ReqInfo memory) {
		uint length = RequestSig[msg.sender][receiver].length;
		if (index < 0 || index >= length) revert("Input must be greater than 10");
		return RequestSig[msg.sender][receiver][index];
	}

	// 响应签名的get和set
	function setResponseSig(address receiver, bytes32 s, bytes32 t) public {
		ResponseSig[msg.sender][receiver].push(
			ResInfo({ s: s, t: t, resTimestamp: block.timestamp })
		);
	}

	function getResponseSig(address receiver, uint index) public view returns (ReqInfo memory) {
		uint length = RequestSig[msg.sender][receiver].length;
		if (index < 0 || index >= length) revert("Input must be greater than 10");
		return RequestSig[msg.sender][receiver][index];
	}
}
