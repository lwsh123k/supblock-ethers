// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract FairInteger {
	// 记录Integer信息
	struct IntegerInfo {
		bytes32 infoHashA; // 请求者信息设置
		uint256 niA; //随机数
		uint256 riA; // 证明
		uint256 tA; // 执行次数
		bytes32 infoHashB; // 响应者信息设置
		uint256 niB;
		uint256 riB;
		uint256 tB;
		bool hasVerify;
	}

	// 记录token chain中, 节点的信息
	struct ChainInfo {
		address sender;
		address receiver;
		uint256 index; // personalInteger映射中数组的下标
	}

	// 记录成功执行的次数
	mapping(address => uint256) private executeTime;
	// 记录每个用户上传的信息
	mapping(address => mapping(address => IntegerInfo[])) private personalInteger;
	// 某一条token chain中, 用的是personalInteger数组中的哪一个记录
	// 记录token chain, address为起点(token chain是为哪个address服务的)
	mapping(address => ChainInfo[]) private IntegerIndex;

	// 判断双方hash都已经上传
	modifier validHash(address sender, address receiver) {
		uint256 len = personalInteger[sender][receiver].length;
		if (len == 0) revert("empty array");
		require(
			// 隐式类型转换
			personalInteger[sender][receiver][len - 1].infoHashA != 0,
			"request message hash not exists"
		);
		require(
			personalInteger[sender][receiver][len - 1].infoHashB != 0,
			"response message hash has existed"
		);
		_;
	}

	// 设置请求者infoHash
	function setReqHash(address receiver, bytes32 mHash) public {
		IntegerInfo memory integerInfo;
		integerInfo.infoHashA = mHash;
		integerInfo.hasVerify = false;
		integerInfo.tA = executeTime[msg.sender];
		integerInfo.tB = executeTime[receiver];
		personalInteger[msg.sender][receiver].push(integerInfo);
	}

	// 设置响应者infoHash
	function setResHash(address sender, bytes32 mHash) public {
		// 要求: 请求者infoHash已经设置过, 响应者infoHash没有设置过
		uint256 len = personalInteger[sender][msg.sender].length;
		if (len == 0) revert("empty array");
		require(
			personalInteger[sender][msg.sender][len - 1].infoHashA != 0,
			"request message hash not exists"
		);
		require(
			personalInteger[sender][msg.sender][len - 1].infoHashB == 0,
			"response message hash has existed"
		);
		personalInteger[sender][msg.sender][len - 1].infoHashB = mHash;
	}

	// 请求者公开ni, ri.
	function setReqInfo(
		address receiver,
		uint256 ni,
		uint256 ri
	) public validHash(msg.sender, receiver) {
		// 要求: 双方的info hash已经设置过
		uint256 len = personalInteger[msg.sender][receiver].length;
		personalInteger[msg.sender][receiver][len - 1].niA = ni;
		personalInteger[msg.sender][receiver][len - 1].riA = ri;
	}

	// 响应者公开ni, ri.
	function setResInfo(
		address sender,
		uint256 ni,
		uint256 ri
	) public validHash(sender, msg.sender) {
		// 要求: 双方的info hash已经设置过
		uint256 len = personalInteger[sender][msg.sender].length;
		personalInteger[sender][msg.sender][len - 1].niB = ni;
		personalInteger[sender][msg.sender][len - 1].riB = ri;
	}

	// 请求者:获取执行次数
	function getReqExecuteTime(address receiver) public view returns (uint256, uint256) {
		return (executeTime[msg.sender], executeTime[receiver]);
	}

	// 响应者:获取执行成功次数
	// 有一种情况: 当响应者通过executeTime获得执行成功次数时, 刚好执行成功了一次
	// 此时executeTime+1, 与请求者的不一致
	function getResExecuteTime(address sender) public view returns (uint256, uint256) {
		uint256 len = personalInteger[sender][msg.sender].length;
		if (len == 0) revert("empty array");
		return (
			personalInteger[sender][msg.sender][len - 1].tA,
			personalInteger[sender][msg.sender][len - 1].tB
		);
	}

	// 验证正确性, index从0开始
	function verifyInfo(
		address sender,
		address receiver,
		uint256 index
	) public view returns (string memory) {
		uint256 len = personalInteger[sender][receiver].length;
		require(index < len, "error index");
		IntegerInfo memory integerInfo = personalInteger[sender][receiver][index];
		bytes32 hashA = keccak256(
			abi.encode(integerInfo.niA, integerInfo.tA, integerInfo.tB, integerInfo.riA)
		);
		bytes32 hashB = keccak256(
			abi.encode(integerInfo.niB, integerInfo.tA, integerInfo.tB, integerInfo.riB)
		);
		if (hashA == integerInfo.infoHashA && hashB == integerInfo.infoHashB)
			return "both true proof";
		else if (hashA != integerInfo.infoHashA) return "requester false proof";
		else return "responser false proof";
	}
}
