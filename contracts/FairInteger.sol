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
		address req;
		address res;
		uint256 index;
	}

	// hash上传事件
	event ReqHashUpload(
		address indexed from,
		address indexed to,
		bytes32 infoHashA,
		uint256 tA,
		uint256 tB,
		uint256 uploadTime,
		uint256 index
	);
	event ResHashUpload(
		address indexed from,
		address indexed to,
		bytes32 infoHashB,
		uint256 tA,
		uint256 tB,
		uint256 uploadTime,
		uint256 index
	);
	// 随机数上传事件
	event ReqInfoUpload(
		address indexed from,
		address indexed to,
		uint256 ni,
		uint256 ri,
		uint256 tA,
		bytes32 hashA,
		uint256 uploadTime,
		uint256 tB
	);
	event ResInfoUpload(
		address indexed from,
		address indexed to,
		uint256 ni,
		uint256 ri,
		uint256 tB,
		bytes32 hashB,
		uint256 uploadTime,
		uint256 tA
	);
	// 随机数重传
	event ReqReuploadNum(
		address indexed from,
		address indexed to,
		uint ni,
		uint ri,
		bytes32 originalHash,
		uint256 uploadTime
	);
	event ResReuploadNum(
		address indexed from,
		address indexed to,
		uint ni,
		uint ri,
		bytes32 originalHash,
		uint256 uploadTime
	);

	// 匿名账户激活事件
	event ActivateAccount(address indexed index, address indexed anonymousAccount);
	mapping(uint => address) private indexToAddress;

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
		require(hashIndex[infoHash].req == address(0), "hash exist");
		_;
	}

	// 设置请求者infoHash
	function setReqHash(address receiver, bytes32 mHash) public onlyHash(mHash) {
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

		// 记录hash
		IntegerInfo memory integerInfo;
		integerInfo.infoHashA = mHash;
		integerInfo.tA = executeTime[msg.sender];
		integerInfo.tB = executeTime[receiver];
		integerInfo.hashTa = block.timestamp;
		personalInteger[msg.sender][receiver].push(integerInfo);
		// 记录索引
		hashIndex[mHash] = hashIndexStruct({ req: msg.sender, res: receiver, index: len });
		emit ReqHashUpload(
			msg.sender,
			receiver,
			mHash,
			integerInfo.tA,
			integerInfo.tB,
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
		// 记录索引
		hashIndex[mHash] = hashIndexStruct({ req: sender, res: msg.sender, index: len });
		emit ResHashUpload(
			msg.sender,
			sender,
			mHash,
			integerInfo.tA,
			integerInfo.tB,
			block.timestamp,
			len - 1
		);
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
		// 执行就增加次数
		executeTime[msg.sender]++;

		// 记录请求者和响应者的事件不需要分开记录, 只需要上传之后就emit事件
		emit ReqInfoUpload(
			msg.sender,
			receiver,
			ni,
			ri,
			integerInfo.tA,
			integerInfo.infoHashA,
			block.timestamp,
			integerInfo.tB
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
		executeTime[msg.sender]++;
		emit ResInfoUpload(
			msg.sender,
			sender,
			ni,
			ri,
			integerInfo.tB,
			integerInfo.infoHashB,
			block.timestamp,
			integerInfo.tA
		);
	}

	// 请求者:获取执行次数, 插入位置的数组下标(从0开始)
	function getReqExecuteTime(address receiver) public view returns (uint256, uint256, uint256) {
		// uint256 len = personalInteger[msg.sender][receiver].length == 0
		// 	? 0
		// 	: personalInteger[msg.sender][receiver].length - 1;
		uint256 len = personalInteger[msg.sender][receiver].length;
		return (executeTime[msg.sender], executeTime[receiver], len);
	}

	// 响应者:获取执行成功次数(not used)
	/* 有一种情况: 当响应者通过executeTime获得执行成功次数时, 刚好执行成功了一次, 此时executeTime+1, 与请求者的不一致
	    或者A请求B(通过socket请求, 所以查看hashTb是否为0)， 但是A没有上传新的数组，这会使得B获得的是上一个数组的旧数据 */
	function getResExecuteTime(address sender) public view returns (uint256, uint256, uint256) {
		uint256 len = personalInteger[sender][msg.sender].length;
		require(len > 0, "empty array");
		// require(personalInteger[sender][msg.sender][len - 1].hashTb == 0, "not latest array"); /////// 删除, emit 中同时包含a和b的执行次数
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

	// 返回最后一个数组内容
	function showLatestStruct(
		address sender,
		address receiver
	) public view returns (IntegerInfo memory) {
		uint256 lastIndex = personalInteger[sender][receiver].length - 1;
		return personalInteger[sender][receiver][lastIndex];
	}

	// 第三阶段, 统一检查
	// 由hash获取索引
	function getIndexOfHash(bytes32 infoHash) public view returns (hashIndexStruct memory index) {
		return hashIndex[infoHash];
	}

	// 检查正确性, from: applicant, to: relay, 0: 检查to上传随机数正确性, 1: 检查from上传随机数正确性
	// 只检查随机数正确性(假设双方都上传了随机数), 其他条件放到真正重传时进行
	// 更多检查放到前端, 只有合适的时候才会调用重传, 重传的合约函数中也会进行检查
	function UnifiedInspection(
		address from,
		address to,
		uint index,
		uint8 types
	) public view returns (bool result) {
		// 检查正确性: 对方上传的是对的 || 对方已经重传过   返回    true
		IntegerInfo memory info = personalInteger[from][to][index];
		// form检查to上传的数字
		if (types == 0) {
			bytes32 hashB = keccak256(abi.encode(info.niB, info.tA, info.tB, info.riB));
			if (hashB == info.infoHashB || info.reuploadInfoB == true) return true;
			else return false;
		}
		// to就检查from上传的数字
		else if (types == 1) {
			bytes32 hashA = keccak256(abi.encode(info.niA, info.tA, info.tB, info.riA));
			if (hashA == info.infoHashA || info.reuploadInfoA == true) return true;
			else return false;
		}
	}

	// 重新上传随机数
	function reuploadNum(address to, uint256 index, uint8 types, uint ni, uint ri) public {
		require(types == 0 || types == 1, "wrong types");
		IntegerInfo memory integerInfo;
		if (types == 0) integerInfo = personalInteger[msg.sender][to][index];
		else integerInfo = personalInteger[to][msg.sender][index];

		// hash上传检查
		require(
			integerInfo.infoHashA != 0 && integerInfo.infoHashB != 0,
			"requester or responder message hash not exists"
		);

		// 超过随机数上传的时间 或者 双方都上传完成
		require(
			integerInfo.hashTb + numTime < block.timestamp ||
				(integerInfo.riA != 0 && integerInfo.riB != 0),
			"not exceed upload time"
		);

		// 请求者重传
		if (types == 0) {
			// 对方上传错误 && 自己已经上传 && 之前没有重传过 && 自己上传的是对的
			require(UnifiedInspection(msg.sender, to, index, types) == false, "random is correct");
			require(integerInfo.riA != 0, "random not upload");
			require(integerInfo.reuploadInfoA == false, "random has reuploaded");
			require(
				UnifiedInspection(msg.sender, to, index, 1) == true,
				"self random is not correct"
			);
			console.log("11111");
			personalInteger[msg.sender][to][index].niA = ni;
			personalInteger[msg.sender][to][index].riA = ri;
			personalInteger[msg.sender][to][index].reuploadInfoA = true;
			emit ReqReuploadNum(
				msg.sender,
				to,
				ni,
				ri,
				personalInteger[msg.sender][to][index].infoHashA,
				block.timestamp
			);
		}
		// 响应者重传
		if (types == 1) {
			require(UnifiedInspection(to, msg.sender, index, types) == false, "random is correct");
			require(integerInfo.riB != 0, "random not upload");
			require(integerInfo.reuploadInfoB == false, "random has reuploaded");
			require(
				UnifiedInspection(to, msg.sender, index, 0) == true,
				"self random is not correct"
			);
			console.log("22222");
			personalInteger[to][msg.sender][index].niB = ni;
			personalInteger[to][msg.sender][index].riB = ri;
			personalInteger[to][msg.sender][index].reuploadInfoB = true;
			emit ResReuploadNum(
				msg.sender,
				to,
				ni,
				ri,
				personalInteger[to][msg.sender][index].infoHashB,
				block.timestamp
			);
		}
	}
}
