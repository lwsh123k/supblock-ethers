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
		bool reuploadInfoA;
		bool reuploadInfoB;
	}

	// 由hash找到索引
	struct hashIndexStruct {
		address applicant;
		address relay;
		uint256 index;
	}

	// 定义事件, 方便监听检索, 请求者type=0, 响应者type=1
	event UploadHash(
		address indexed from,
		address indexed to,
		uint8 indexed types,
		bytes32 infoHash,
		uint256 uploadTime,
		uint256 index
	);
	event UpLoadNum(
		address indexed from,
		address indexed to,
		uint8 indexed types,
		uint256 ni,
		uint256 ri,
		uint256 t,
		uint256 uploadTime
	);
	event ReuploadNum(
		address indexed from,
		address indexed to,
		uint8 types,
		uint ni,
		uint ri,
		uint256 uploadTime
	);

	// 记录成功执行的次数
	mapping(address => uint256) private executeTime;
	// 记录每个用户上传的信息
	mapping(address => mapping(address => IntegerInfo[])) private personalInteger;
	// 记录上传信息hash的索引, hash要求唯一??
	mapping(bytes32 => hashIndexStruct) internal hashIndex;

	// 时间要求
	uint private hashTime;
	uint private numTime;

	// 构造函数, 都是30s
	constructor(uint _hashTime, uint _numTime) {
		hashTime = _hashTime;
		numTime = _numTime;
	}

	// hash ri不为0, 分别判断hash和随机数是否已经上传
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

	// hash唯一
	modifier onlyHash(bytes32 infoHash) {
		require(hashIndex[infoHash].applicant != address(0), "hash exist");
		_;
	}

	// 设置请求者infoHash
	function setReqHash(address receiver, bytes32 mHash) public {
		// 用hash是否等于0, 判断是否已经上传
		require(mHash != 0, "hash is zero");
		// 获取最新的数据, 要求上一次hashB已经上传 或者 超时未传
		uint len = personalInteger[msg.sender][receiver].length;
		if (len != 0) {
			IntegerInfo memory temp = personalInteger[msg.sender][receiver][len - 1];
			require(
				temp.infoHashB != 0 || temp.hashTa + hashTime < block.timestamp,
				"last data not processed"
			);
		}

		IntegerInfo memory integerInfo;
		integerInfo.infoHashA = mHash;
		integerInfo.tA = executeTime[msg.sender];
		integerInfo.tB = executeTime[receiver];
		integerInfo.hashTa = block.timestamp;
		personalInteger[msg.sender][receiver].push(integerInfo);
		emit UploadHash(
			msg.sender,
			receiver,
			0,
			mHash,
			block.timestamp,
			personalInteger[msg.sender][receiver].length - 1
		);
	}

	// 设置响应者infoHash
	function setResHash(address sender, bytes32 mHash) public {
		// 要求: 请求者infoHash已经设置过, 响应者infoHash没有设置过
		//       hashA上传后的30s内, hashB也要上传
		require(mHash != 0, "hash is zero");
		uint256 len = personalInteger[sender][msg.sender].length;
		if (len == 0) revert("empty array");
		IntegerInfo memory integerInfo = personalInteger[sender][msg.sender][len - 1];
		require(integerInfo.infoHashA != 0, "request message hash not exists");
		require(integerInfo.infoHashB == 0, "response message hash has existed");
		require(
			integerInfo.hashTa + hashTime >= block.timestamp,
			"responder not upload in allowed time"
		);
		personalInteger[sender][msg.sender][len - 1].infoHashB = mHash;
		personalInteger[sender][msg.sender][len - 1].hashTb = block.timestamp;
		emit UploadHash(msg.sender, sender, 1, mHash, block.timestamp, len - 1);
	}

	// 请求者公开ni, ri.
	function setReqInfo(
		address receiver,
		uint256 ni,
		uint256 ri
	) public validHash(msg.sender, receiver) {
		// 要求: 双方的info hash已经设置过
		// 		 ni ri不能重复设置
		//		 响应者B的hash上传之后的30s内上传ni, ri
		uint256 len = personalInteger[msg.sender][receiver].length;
		IntegerInfo memory integerInfo = personalInteger[msg.sender][receiver][len - 1];
		// integerInfo.ri的初始值为0, 为了便于判断ri是否已经上传, 要求证据ri != 0
		require(ri != 0, "ri is zero");
		require(integerInfo.riA == 0, "requester ri has existed");
		require(
			integerInfo.hashTb + numTime >= block.timestamp,
			"requester ni ri not upload in allowed time"
		);
		personalInteger[msg.sender][receiver][len - 1].niA = ni;
		personalInteger[msg.sender][receiver][len - 1].riA = ri;
		// 上传正确增加执行次数???
		bytes32 hashA = keccak256(abi.encode(ni, integerInfo.tA, integerInfo.tB, ri));
		if (hashA == integerInfo.infoHashA) {
			executeTime[msg.sender]++;
		}
		// 记录请求者和响应者的事件不需要分开记录, 只需要上传之后就emit事件
		emit UpLoadNum(msg.sender, receiver, 0, ni, ri, integerInfo.tA, block.timestamp);
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

		// 是否重复上传ni ri
		require(ri != 0, "ri is zero");
		require(integerInfo.riB == 0, "responder ri has existed");
		require(
			integerInfo.hashTb + numTime >= block.timestamp,
			"responder ni ri not upload in allowed time"
		);
		personalInteger[sender][msg.sender][len - 1].niB = ni;
		personalInteger[sender][msg.sender][len - 1].riB = ri;

		// 增加执行次数
		bytes32 hashB = keccak256(abi.encode(ni, integerInfo.tA, integerInfo.tB, ri));
		if (hashB == integerInfo.infoHashB) {
			executeTime[msg.sender]++;
		}
		emit UpLoadNum(msg.sender, sender, 1, ni, ri, integerInfo.tB, block.timestamp);
	}

	// 请求者:获取执行次数, 插入位置的数组下标(从0开始)
	function getReqExecuteTime(address receiver) public view returns (uint256, uint256, uint256) {
		// uint256 len = personalInteger[msg.sender][receiver].length == 0
		// 	? 0
		// 	: personalInteger[msg.sender][receiver].length - 1;
		uint256 len = personalInteger[msg.sender][receiver].length;
		return (executeTime[msg.sender], executeTime[receiver], len);
	}

	// 响应者:获取执行成功次数
	/* 有一种情况: 当响应者通过executeTime获得执行成功次数时, 刚好执行成功了一次, 此时executeTime+1, 与请求者的不一致
	    或者A请求B(通过socket请求, 所以查看hashTb是否为0)， 但是A没有上传新的数组，这会使得B获得的是上一个数组的旧数据 */
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

	// 返回所选的随机数
	function showNum(
		address sender,
		address receiver,
		uint256 index
	) public view returns (uint256, uint256, bool, bool) {
		uint256 len = personalInteger[sender][receiver].length;
		require(index < len, "error index");
		IntegerInfo memory integerInfo = personalInteger[sender][receiver][index];
		return (
			integerInfo.niA,
			integerInfo.niB,
			integerInfo.reuploadInfoA,
			integerInfo.reuploadInfoB
		);
	}

	// 获取最新的num
	function showLatestNum(
		address sender,
		address receiver
	) public view returns (uint256, uint256, bool, bool) {
		uint256 lastIndex = personalInteger[sender][receiver].length - 1;
		IntegerInfo memory integerInfo = personalInteger[sender][receiver][lastIndex];
		return (
			integerInfo.niA,
			integerInfo.niB,
			integerInfo.reuploadInfoA,
			integerInfo.reuploadInfoB
		);
	}

	// 第三阶段, 统一检查
	// 由hash获取索引
	function getIndexOfHash(bytes32 infoHash) public view returns (hashIndexStruct memory index) {
		return hashIndex[infoHash];
	}

	// 检查对方的正确性. 和谁交互, 检查的索引, 是0 -> applicant还是1 -> relay
	function UnifiedInspection(
		address to,
		uint index,
		uint8 types
	) public view returns (bool result) {
		// 检查正确性
		IntegerInfo memory info;
		// 请求者就检查响应者上传的数字
		if (types == 0) {
			// 没有必要检查索引, 如果索引不对, 会自动revert
			info = personalInteger[msg.sender][to][index];
			// 是否上传, 要求rib != 0
			if (info.riB == 0) return false;
			// 上传是否正确
			bytes32 hashB = keccak256(abi.encode(info.niB, info.tA, info.tB, info.riB));
			if (hashB == info.infoHashB) return true;
			else return false;
		}
		// 响应者就检查请求者上传的数字
		else if (types == 1) {
			info = personalInteger[to][msg.sender][index];
			if (info.riA == 0) return false;
			bytes32 hashA = keccak256(abi.encode(info.niA, info.tA, info.tB, info.riA));
			if (hashA == info.infoHashA) return true;
			else return false;
		}
	}

	// 重新上传随机数
	function reuploadNum(address to, uint256 index, uint8 types, uint ni, uint ri) public {
		// 索引正确
		require(index < personalInteger[msg.sender][to].length, "error index");
		require(types == 0 || types == 1, "wrong types");
		IntegerInfo memory integerInfo;
		if (types == 0) integerInfo = personalInteger[msg.sender][to][index];
		else integerInfo = personalInteger[to][msg.sender][index];

		// hash上传检查
		require(
			integerInfo.infoHashA != 0 && integerInfo.infoHashB != 0,
			"requester or responder message hash not exists"
		);

		// 超过随机数上传的时间
		require(integerInfo.hashTb + numTime < block.timestamp, "not exceed upload time");
		// 随机数错误才能上传
		require(UnifiedInspection(to, index, types) == false, "random is correct");

		// 之前没有重传过
		if (types == 0) require(integerInfo.reuploadInfoA == false, "has reuploaded");
		else require(integerInfo.reuploadInfoB == false, "has reuploaded");

		// 请求者重传
		if (types == 0) {
			console.log("11111");
			personalInteger[msg.sender][to][index].niA = ni;
			personalInteger[msg.sender][to][index].riA = ri;
			personalInteger[msg.sender][to][index].reuploadInfoA = true;
			emit ReuploadNum(msg.sender, to, types, ni, ri, block.timestamp);
		}
		// 响应者重传
		if (types == 1) {
			console.log("22222");
			personalInteger[msg.sender][to][index].niB = ni;
			personalInteger[msg.sender][to][index].riB = ri;
			personalInteger[msg.sender][to][index].reuploadInfoB = true;
			emit ReuploadNum(msg.sender, to, types, ni, ri, block.timestamp);
		}
	}

	// not used.
	// 验证正确性(index从0开始): 有一方上传错误
	// 验证时间: 有一方没有上传  或者  有一方没有按规定时间上传

	/* function verifyInfo(
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
 */
}
