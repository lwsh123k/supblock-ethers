// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract FairInteger {
	// 记录Integer信息
	// 如果是hash没有响应, 重新请求; 如果是ni和ri没有按照规定时间上传, 重新选择随机数
	struct IntegerInfo {
		bytes32 infoHashA; // 请求者信息设置
		uint256 hashTa; // 上传hash的时间, 未按规定时间上传ni和ri, 重新选择随机数
		uint256 niA; //随机数
		uint256 riA; // 证明
		uint256 tA; // 执行次数
		bytes32 infoHashB; // 响应者信息设置
		uint256 hashTb;
		uint256 niB;
		uint256 riB;
		uint256 tB;
		bool hasVerify;
		uint8 state;
	}

	// 记录token chain中, 节点的信息
	struct ChainInfo {
		address sender;
		address receiver;
		uint256 index; // personalInteger映射中数组的下标
	}

	// 定义事件, 方便监听检索
	event ResHashUpload(address indexed from, address indexed to, bytes32 infoHashB);
	event ReqInfoUpload(address indexed from, address indexed to, uint8 state);
	event ResInfoUpload(address indexed from, address indexed to, uint8 state);
	event UpLoadNum(address indexed from, address indexed to, uint8 state);
	//event ReuploadRandomNum(address indexed from, address indexed to, uint8 source, uint8 state);

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
			"requester message hash not exists"
		);
		require(
			personalInteger[sender][receiver][len - 1].infoHashB != 0,
			"responder message hash not existed"
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
		integerInfo.hashTa = block.timestamp;
		personalInteger[msg.sender][receiver].push(integerInfo);
	}

	// 设置响应者infoHash
	function setResHash(address sender, bytes32 mHash) public {
		// 要求: 请求者infoHash已经设置过, 响应者infoHash没有设置过
		//       hashA上传后的30s内, hashB也要上传
		uint256 len = personalInteger[sender][msg.sender].length;
		if (len == 0) revert("empty array");
		IntegerInfo memory integerInfo = personalInteger[sender][msg.sender][len - 1];
		require(integerInfo.infoHashA != 0, "request message hash not exists");
		require(integerInfo.infoHashB == 0, "response message hash has existed");
		require(integerInfo.hashTa + 30 seconds >= block.timestamp, "responder not upload in 30s");
		personalInteger[sender][msg.sender][len - 1].infoHashB = mHash;
		personalInteger[sender][msg.sender][len - 1].hashTb = block.timestamp;
		emit ResHashUpload(sender, msg.sender, mHash);
	}

	// 请求者公开ni, ri.
	function setReqInfo(
		address receiver,
		uint256 ni,
		uint256 ri
	) public validHash(msg.sender, receiver) {
		// 要求: 双方的info hash已经设置过
		// 		 ni ri不能重复设置
		//		 响应者B的hash上传之后的60s内上传ni, ri
		uint256 len = personalInteger[msg.sender][receiver].length;
		IntegerInfo memory integerInfo = personalInteger[msg.sender][receiver][len - 1];
		// integerInfo.ri的初始值为0, 为了便于判断ri是否已经上传, 要求证据ri != 0
		require(ri != 0, "ri is zero");
		require(integerInfo.riA == 0, "requester ri has existed");
		require(
			integerInfo.hashTb + 60 seconds >= block.timestamp,
			"requester ni ri not upload in allowed time"
		);
		personalInteger[msg.sender][receiver][len - 1].niA = ni;
		personalInteger[msg.sender][receiver][len - 1].riA = ri;
		// 上传时就判断正确性
		bytes32 hashA = keccak256(abi.encode(ni, integerInfo.tA, integerInfo.tB, ri));
		uint8 state = personalInteger[msg.sender][receiver][len - 1].state;
		if (hashA == integerInfo.infoHashA) {
			executeTime[msg.sender]++;
			if (state == 0) personalInteger[msg.sender][receiver][len - 1].state = 4;
			else if (state == 5) personalInteger[msg.sender][receiver][len - 1].state = 1;
			else if (state == 7) personalInteger[msg.sender][receiver][len - 1].state = 2;
		} else {
			if (state == 0) personalInteger[msg.sender][receiver][len - 1].state = 6;
			else if (state == 5) personalInteger[msg.sender][receiver][len - 1].state = 3;
			else if (state == 7) personalInteger[msg.sender][receiver][len - 1].state = 10;
		}

		// 记录请求者和响应者的事件不需要分开记录, 只需要上传之后就emit事件
		emit UpLoadNum(msg.sender, receiver, personalInteger[msg.sender][receiver][len - 1].state);

		// 记录事件
		emit ReqInfoUpload(
			msg.sender,
			receiver,
			personalInteger[msg.sender][receiver][len - 1].state
		);
	}

	// 响应者公开ni, ri.
	function setResInfo(
		address sender,
		uint256 ni,
		uint256 ri
	) public validHash(sender, msg.sender) {
		// 要求: 双方的info hash已经设置过
		// 		 ni ri不能重复设置
		//       在规定时间内(120s)上传ni, ri
		uint256 len = personalInteger[sender][msg.sender].length;
		IntegerInfo memory integerInfo = personalInteger[sender][msg.sender][len - 1];

		// integerInfo.riB的初始值为0, 为了避免判断错误, 要求证据ri != 0
		require(ri != 0, "ri is zero");
		require(integerInfo.riB == 0, "responder ri has existed");
		require(
			integerInfo.hashTb + 60 seconds >= block.timestamp,
			"responder ni ri not upload in allowed time"
		);
		personalInteger[sender][msg.sender][len - 1].niB = ni;
		personalInteger[sender][msg.sender][len - 1].riB = ri;

		// 上传时就判断正确性
		bytes32 hashB = keccak256(abi.encode(ni, integerInfo.tA, integerInfo.tB, ri));
		uint8 state = personalInteger[sender][msg.sender][len - 1].state;
		if (hashB == integerInfo.infoHashB) {
			executeTime[msg.sender]++;
			if (state == 0) personalInteger[sender][msg.sender][len - 1].state = 5;
			else if (state == 4) personalInteger[sender][msg.sender][len - 1].state = 1;
			else if (state == 6) personalInteger[sender][msg.sender][len - 1].state = 3;
		} else {
			if (state == 0) personalInteger[sender][msg.sender][len - 1].state = 7;
			else if (state == 4) personalInteger[sender][msg.sender][len - 1].state = 2;
			else if (state == 6) personalInteger[sender][msg.sender][len - 1].state = 10;
		}
		emit UpLoadNum(sender, msg.sender, personalInteger[sender][msg.sender][len - 1].state);
		emit ResInfoUpload(sender, msg.sender, personalInteger[sender][msg.sender][len - 1].state);
	}

	// 请求者:获取执行次数, 当前数组的下标(从0开始)
	function getReqExecuteTime(address receiver) public view returns (uint256, uint256, uint256) {
		// uint256 len = personalInteger[msg.sender][receiver].length == 0
		// 	? 0
		// 	: personalInteger[msg.sender][receiver].length - 1;
		uint256 len = personalInteger[msg.sender][receiver].length;
		return (executeTime[msg.sender], executeTime[receiver], len);
	}

	// 响应者:获取执行成功次数
	/* 有一种情况: 当响应者通过executeTime获得执行成功次数时, 刚好执行成功了一次, 此时executeTime+1, 与请求者的不一致
	    或者A请求B， 但是A没有上传新的数组，这会使得B获得的是上一个数组的旧数据 */
	function getResExecuteTime(address sender) public view returns (uint256, uint256, uint256) {
		uint256 len = personalInteger[sender][msg.sender].length;
		require(len > 0, "empty array");
		require(personalInteger[sender][msg.sender][len - 1].hashTb == 0, "not latest array");
		return (
			personalInteger[sender][msg.sender][len - 1].tA,
			personalInteger[sender][msg.sender][len - 1].tB,
			len - 1
		);
	}

	// 验证正确性(index从0开始): 有一方上传错误
	// 验证时间: 有一方没有上传  或者  有一方没有按规定时间上传
	// not used.
	function verifyInfo(
		address sender,
		address receiver,
		uint256 index
	) public returns (string memory) {
		uint256 len = personalInteger[sender][receiver].length;
		require(index < len, "error index");
		IntegerInfo memory integerInfo = personalInteger[sender][receiver][index];

		// hash都没有上传
		if (integerInfo.hashTa == 0) return "req not upload hash";
		if (integerInfo.hashTb == 0) return "res not upload hash";
		// 上传了hash, 但ni和ri上传出问题. 验证的时间点 > 等待上传的时间点
		if (
			integerInfo.hashTa + 60 seconds >= block.timestamp ||
			integerInfo.hashTb + 60 seconds >= block.timestamp
		) return "verify not in time";
		// 有一方没有上传
		if (integerInfo.niA == 0 || integerInfo.riA == 0) return "req not upload ni or ri";
		if (integerInfo.niB == 0 || integerInfo.riB == 0) return "res not upload ni or ri";

		// 取hash, 验证正确性
		bytes32 hashA = keccak256(
			abi.encode(integerInfo.niA, integerInfo.tA, integerInfo.tB, integerInfo.riA)
		);
		bytes32 hashB = keccak256(
			abi.encode(integerInfo.niB, integerInfo.tA, integerInfo.tB, integerInfo.riB)
		);

		// 如果验证正确且以前没有验证过, 执行次数增加
		personalInteger[sender][receiver][index].hasVerify = true;
		if (hashA == integerInfo.infoHashA && hashB == integerInfo.infoHashB) {
			if (!integerInfo.hasVerify) {
				executeTime[sender]++;
				executeTime[receiver]++;
			}
			return "both true proof";
		} else if (hashA != integerInfo.infoHashA && hashB == integerInfo.infoHashB) {
			if (!integerInfo.hasVerify) executeTime[receiver]++;
			return "req false proof";
		} else if (hashA == integerInfo.infoHashA && hashB != integerInfo.infoHashB) {
			if (!integerInfo.hasVerify) executeTime[sender]++;
			return "res false proof";
		} else return "both false proof";
	}

	// 返回所选的随机数
	function showNum(
		address sender,
		address receiver,
		uint256 index
	) public view returns (uint256, uint256, uint8) {
		uint256 len = personalInteger[sender][receiver].length;
		require(index < len, "error index");
		IntegerInfo memory integerInfo = personalInteger[sender][receiver][index];
		return (integerInfo.niA, integerInfo.niB, integerInfo.state);
	}

	// 获取最新的num
	function showLatestNum(
		address sender,
		address receiver
	) public view returns (uint256, uint256, uint8) {
		uint256 lastIndex = personalInteger[sender][receiver].length - 1;
		IntegerInfo memory integerInfo = personalInteger[sender][receiver][lastIndex];
		return (integerInfo.niA, integerInfo.niB, integerInfo.state);
	}

	//获取当前执行的状态
	function getState(address sender, address receiver, uint256 index) public view returns (uint8) {
		uint256 len = personalInteger[sender][receiver].length;
		require(index < len, "error index");
		return personalInteger[sender][receiver][index].state;
	}

	// 重新上传随机数, source区分是请求者(=0)还是响应者(=1)
	function reuploadNum(
		address sender,
		address receiver,
		uint256 index,
		uint8 source,
		uint ni,
		uint ri
	) public {
		// 区分请求者和响应者
		if (source == 0) require(sender == msg.sender, "not requester");
		else if (source == 1) require(receiver == msg.sender, "not responder");
		uint256 len = personalInteger[sender][receiver].length;
		require(index < len, "error index");
		IntegerInfo memory integerInfo = personalInteger[sender][receiver][index];

		// 要求双方hash都已经上传, 之后的120s之内没有上传ni ri 或者 上传的ni ri是错的, 正确一方重新上传
		// 要求hash的原因: 通知对方的socket中断 或者 对方故意不上传

		// hash上传检查
		require(
			integerInfo.infoHashA != 0 && integerInfo.infoHashB != 0,
			"requester or responder message hash not exists"
		);
		// 如果双方都在120s内上传, 就不检查:120s, 否则就检查
		// 请求者正确, 另一方未判断;    响应者正确, 另一方未判断    需要满足时间要求才可以修改
		// 对于请求者错误, 另一方未判断;    响应者错误, 另一方未判断    可以直接修改
		if (integerInfo.state == 4 || integerInfo.state == 5) {
			require(integerInfo.hashTb + 60 seconds < block.timestamp, "not exceed 60s");
		}

		// 请求者超时没有上传 或者 上传错误的，响应者重传
		console.log(integerInfo.state);
		if (
			(integerInfo.state == 5 || integerInfo.state == 3 || integerInfo.state == 6) &&
			source == 1
		) {
			console.log("11111");
			personalInteger[sender][receiver][index].niB = ni;
			personalInteger[sender][receiver][index].riB = ri;
			personalInteger[sender][receiver][index].state = 9;
		}
		// 响应者超时没有上传 或者 上传错误的, 请求者重传
		if (
			(integerInfo.state == 4 || integerInfo.state == 2 || integerInfo.state == 7) &&
			source == 0
		) {
			console.log("22222");
			personalInteger[sender][receiver][index].niA = ni;
			personalInteger[sender][receiver][index].riA = ri;
			personalInteger[sender][receiver][index].state = 8;
		}
		emit UpLoadNum(sender, receiver, personalInteger[sender][receiver][index].state);
	}
}
