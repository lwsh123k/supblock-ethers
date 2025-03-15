// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

/**
 * @title FairInteger
 * @dev Gas优化示例版
 */
contract FairInteger {
	/* ---------------------------------------------------------------------
       自定义错误 —— 代替 revert("...")，可节省字节码和Gas
    --------------------------------------------------------------------- */
	error EmptyArray();
	error ZeroHash();
	error HashAlreadyExists();
	error RequesterHashMissing();
	error ResponderHashMissing();
	error HashTimeExpired();
	error NiRiAlreadySet();
	error NiRiTimeExpired();
	error RandomIsCorrect();
	error RandomNotUploaded();
	error RandomHasReuploaded();
	error SelfRandomNotCorrect();
	error NoAddressFound();
	error PublicKeyMismatch();
	error LastDataNotProcessed();
	error ResponseHashExisted();
	error RiIsZero();
	error NotExceedUploadTime();
	error RequesterOrResponderHashNotExist();
	error WrongIndex();

	/* ---------------------------------------------------------------------
       数据结构
    --------------------------------------------------------------------- */
	// 利用slot打包：infoHashA, infoHashB各占1个slot；
	// hashTa/hashTb降为uint64、再与tA/tB/reuploadFlags打包进2个slot；
	// niA/niB/riA/riB各1个slot。
	struct IntegerInfo {
		// slot1
		bytes32 infoHashA;
		// slot2
		bytes32 infoHashB;
		// slot3
		uint64 hashTa;
		uint64 hashTb;
		// slot4
		uint64 tA;
		uint64 tB;
		uint8 reuploadFlags; // 还剩 120bits 空闲
		// slot5
		uint256 niA;
		// slot6
		uint256 niB;
		// slot7
		uint256 riA;
		// slot8
		uint256 riB;
	}

	// 将 address+index 打包
	struct hashIndexStruct {
		// slot1: address req (160 bits) + uint96 index
		address req;
		uint96 index;
		// slot2: address res (160 bits)
		address res;
		// 剩余 96 bits 空
	}

	/* ---------------------------------------------------------------------
       事件
    --------------------------------------------------------------------- */
	event ReqHashUpload(
		address indexed from,
		address indexed to,
		bytes32 infoHashA,
		uint64 tA,
		uint64 tB,
		uint96 index
	);

	event ResHashUpload(
		address indexed from,
		address indexed to,
		bytes32 infoHashB,
		uint64 tA,
		uint64 tB,
		uint96 index
	);

	event ReqInfoUpload(
		address indexed from,
		address indexed to,
		uint256 ni,
		uint256 ri,
		uint64 tA,
		uint64 tB,
		bytes32 hashA,
		bytes32 hashB
	);

	event ResInfoUpload(
		address indexed from,
		address indexed to,
		uint256 ni,
		uint256 ri,
		uint64 tA,
		uint64 tB,
		bytes32 hashA,
		bytes32 hashB
	);

	event ReqReuploadNum(
		address indexed from,
		address indexed to,
		uint256 ni,
		uint256 ri,
		bytes32 originalHashA,
		bytes32 originalHashB
	);

	event ResReuploadNum(
		address indexed from,
		address indexed to,
		uint256 ni,
		uint256 ri,
		bytes32 originalHashA,
		bytes32 originalHashB
	);

	event ActivateAccount(uint256 indexed index, address indexed anonymousAccount, bytes publicKey);

	/* ---------------------------------------------------------------------
       状态变量
    --------------------------------------------------------------------- */
	// 调用计数
	mapping(address => uint64) private executeTime;

	// 记录双方的 IntegerInfo 列表
	mapping(address => mapping(address => IntegerInfo[])) private personalInteger;

	// 哈希对应的唯一索引
	mapping(bytes32 => hashIndexStruct) internal hashIndex;

	// 账户激活
	mapping(uint256 => address) private indexToAddress;
	mapping(address => bytes) private addressToPublicKey;
	uint256 public count; // 已激活账户数

	// 时间要求改为immutable，减少SLOAD
	uint64 private immutable hashTime;
	uint64 private immutable numTime;

	/* ---------------------------------------------------------------------
       构造函数
    --------------------------------------------------------------------- */
	constructor(uint64 _hashTime, uint64 _numTime) {
		hashTime = _hashTime;
		numTime = _numTime;
	}

	/* ---------------------------------------------------------------------
       修饰器
    --------------------------------------------------------------------- */
	modifier validHash(address sender, address receiver) {
		uint256 len = personalInteger[sender][receiver].length;
		if (len == 0) revert EmptyArray();
		IntegerInfo storage info = personalInteger[sender][receiver][len - 1];
		if (info.infoHashA == bytes32(0)) revert RequesterHashMissing();
		if (info.infoHashB == bytes32(0)) revert ResponderHashMissing();
		_;
	}

	modifier onlyNewHash(bytes32 infoHash) {
		if (infoHash == bytes32(0)) revert ZeroHash();
		if (hashIndex[infoHash].req != address(0)) revert HashAlreadyExists();
		_;
	}

	/* ---------------------------------------------------------------------
       账户激活相关
    --------------------------------------------------------------------- */
	// sig参数暂时省略，如果要做签名校验可以再加
	function activateAccount(bytes32 /*sig*/, bytes calldata publicKey) external {
		// 验证公钥与msg.sender匹配
		if (!_verifyPublicKey(publicKey, msg.sender)) {
			revert PublicKeyMismatch();
		}
		indexToAddress[count] = msg.sender;
		addressToPublicKey[msg.sender] = publicKey;

		emit ActivateAccount(count, msg.sender, publicKey);

		unchecked {
			++count;
		}
	}

	function getAddressById(
		uint256 _index
	) external view returns (address account, bytes memory pubKey) {
		account = indexToAddress[_index];
		if (account == address(0)) revert NoAddressFound();
		pubKey = addressToPublicKey[account];
	}

	function getPublicKeyByAddress(address account) external view returns (bytes memory) {
		return addressToPublicKey[account];
	}

	/* ---------------------------------------------------------------------
       上传Hash阶段
    --------------------------------------------------------------------- */
	// 请求者上传hash(A)
	function setReqHash(address receiver, bytes32 mHash) external onlyNewHash(mHash) {
		uint256 len = personalInteger[msg.sender][receiver].length;

		// 如果之前有数据，检查前一条是否已处理或已超时
		if (len != 0) {
			IntegerInfo storage prev = personalInteger[msg.sender][receiver][len - 1];
			// 如果上次记录B-hash还没上传完成 且 未过hashTime，则不允许开新局
			if (
				prev.infoHashB == bytes32(0) && (uint256(prev.hashTa) + hashTime >= block.timestamp)
			) {
				revert LastDataNotProcessed();
			}
		}

		// 新增一条记录
		IntegerInfo storage info = personalInteger[msg.sender][receiver].push();
		info.infoHashA = mHash;
		info.tA = executeTime[msg.sender];
		info.tB = executeTime[receiver];
		info.hashTa = uint64(block.timestamp);

		// 记录全局索引
		uint96 newIndex = uint96(len);
		hashIndex[mHash] = hashIndexStruct({ req: msg.sender, index: newIndex, res: receiver });

		emit ReqHashUpload(msg.sender, receiver, mHash, info.tA, info.tB, newIndex);
	}

	// 响应者上传hash(B)
	function setResHash(address sender, bytes32 mHash) external {
		if (mHash == bytes32(0)) revert ZeroHash();

		uint256 len = personalInteger[sender][msg.sender].length;
		if (len == 0) revert EmptyArray();

		IntegerInfo storage info = personalInteger[sender][msg.sender][len - 1];
		if (info.infoHashA == bytes32(0)) revert RequesterHashMissing();
		if (info.infoHashB != bytes32(0)) revert ResponseHashExisted();
		if (uint256(info.hashTa) + hashTime < block.timestamp) revert HashTimeExpired();

		info.infoHashB = mHash;
		info.hashTb = uint64(block.timestamp);

		// 全局索引表
		hashIndex[mHash] = hashIndexStruct({
			req: sender,
			index: uint96(len - 1),
			res: msg.sender
		});

		emit ResHashUpload(msg.sender, sender, mHash, info.tA, info.tB, uint96(len - 1));
	}

	/* ---------------------------------------------------------------------
       上传随机数阶段
    --------------------------------------------------------------------- */
	// 请求者上传ni, ri
	function setReqInfo(
		address receiver,
		uint256 ni,
		uint256 ri
	) external validHash(msg.sender, receiver) {
		if (ri == 0) revert RiIsZero();

		uint256 len = personalInteger[msg.sender][receiver].length;
		IntegerInfo storage info = personalInteger[msg.sender][receiver][len - 1];
		if (info.riA != 0) revert NiRiAlreadySet();

		if (uint256(info.hashTb) + numTime < block.timestamp) revert NiRiTimeExpired();

		info.niA = ni;
		info.riA = ri;

		unchecked {
			++executeTime[msg.sender];
		}

		emit ReqInfoUpload(
			msg.sender,
			receiver,
			ni,
			ri,
			info.tA,
			info.tB,
			info.infoHashA,
			info.infoHashB
		);
	}

	// 响应者上传ni, ri
	function setResInfo(
		address sender,
		uint256 ni,
		uint256 ri
	) external validHash(sender, msg.sender) {
		if (ri == 0) revert RiIsZero();

		uint256 len = personalInteger[sender][msg.sender].length;
		IntegerInfo storage info = personalInteger[sender][msg.sender][len - 1];
		if (info.riB != 0) revert NiRiAlreadySet();

		if (uint256(info.hashTb) + numTime < block.timestamp) revert NiRiTimeExpired();

		info.niB = ni;
		info.riB = ri;

		unchecked {
			++executeTime[msg.sender];
		}

		emit ResInfoUpload(
			msg.sender,
			sender,
			ni,
			ri,
			info.tA,
			info.tB,
			info.infoHashA,
			info.infoHashB
		);
	}

	/* ---------------------------------------------------------------------
       Getter 函数
    --------------------------------------------------------------------- */
	// 请求者视角
	function getReqExecuteTime(address receiver) external view returns (uint64, uint64, uint256) {
		// 注意：返回 (请求者executeTime, 接收者executeTime, 当前个人数组长度)
		uint256 len = personalInteger[msg.sender][receiver].length;
		return (executeTime[msg.sender], executeTime[receiver], len);
	}

	// 响应者视角
	function getResExecuteTime(address sender) external view returns (uint64, uint64, uint256) {
		uint256 len = personalInteger[sender][msg.sender].length;
		if (len == 0) revert EmptyArray();
		IntegerInfo storage info = personalInteger[sender][msg.sender][len - 1];
		return (info.tA, info.tB, len - 1);
	}

	// 返回指定索引处的随机数 & 是否有重传
	function showNum(
		address sender,
		address receiver,
		uint256 index
	) external view returns (uint256, uint256, bool, bool) {
		uint256 len = personalInteger[sender][receiver].length;
		if (index >= len) revert WrongIndex();

		IntegerInfo storage info = personalInteger[sender][receiver][index];
		bool reA = (info.reuploadFlags & 0x01) != 0;
		bool reB = (info.reuploadFlags & 0x02) != 0;

		return (info.niA, info.niB, reA, reB);
	}

	// 返回最新一次的随机数
	function showLatestNum(
		address sender,
		address receiver
	) external view returns (uint256, uint256, bool, bool) {
		uint256 lastIndex = personalInteger[sender][receiver].length - 1;
		IntegerInfo storage info = personalInteger[sender][receiver][lastIndex];
		bool reA = (info.reuploadFlags & 0x01) != 0;
		bool reB = (info.reuploadFlags & 0x02) != 0;

		return (info.niA, info.niB, reA, reB);
	}

	// 返回最新一条 IntegerInfo
	function showLatestStruct(
		address sender,
		address receiver
	) external view returns (IntegerInfo memory) {
		uint256 lastIndex = personalInteger[sender][receiver].length - 1;
		return personalInteger[sender][receiver][lastIndex];
	}

	// 通过 hash 查询 IntegerInfo
	function getNumByHash(bytes32 infoHash) external view returns (IntegerInfo memory) {
		hashIndexStruct storage data = hashIndex[infoHash];
		return personalInteger[data.req][data.res][data.index];
	}

	// 获取 hash 对应的索引信息
	function getIndexOfHash(bytes32 infoHash) external view returns (hashIndexStruct memory) {
		return hashIndex[infoHash];
	}

	/* ---------------------------------------------------------------------
       第三阶段：统一检查 + 重传随机数
    --------------------------------------------------------------------- */
	// types=0 => 检查 B 的随机数；types=1 => 检查 A 的随机数
	function UnifiedInspection(
		address from,
		address to,
		uint256 index,
		uint8 types
	) public view returns (bool) {
		IntegerInfo storage info = personalInteger[from][to][index];
		// 0 -> 检查B；1 -> 检查A
		if (types == 0) {
			bool reB = (info.reuploadFlags & 0x02) != 0;
			bytes32 hashB = keccak256(abi.encode(info.niB, info.tA, info.tB, info.riB));
			return (hashB == info.infoHashB || reB);
		} else {
			bool reA = (info.reuploadFlags & 0x01) != 0;
			bytes32 hashA = keccak256(abi.encode(info.niA, info.tA, info.tB, info.riA));
			return (hashA == info.infoHashA || reA);
		}
	}

	// 重传随机数
	// types=0 => 重传A；types=1 => 重传B
	function reuploadNum(
		address other,
		uint256 index,
		uint8 types,
		uint256 ni,
		uint256 ri
	) external {
		if (types > 1) revert WrongIndex();
		// 根据 types 判断 Storage 位置
		IntegerInfo storage info = (
			types == 0
				? personalInteger[msg.sender][other][index]
				: personalInteger[other][msg.sender][index]
		);

		if (info.infoHashA == bytes32(0) || info.infoHashB == bytes32(0)) {
			revert RequesterOrResponderHashNotExist();
		}

		// 必须超过上传随机数阶段或双方都上传完成
		bool timeExceeded = (uint256(info.hashTb) + numTime < block.timestamp);
		bool bothUploaded = (info.riA != 0 && info.riB != 0);
		if (!timeExceeded && !bothUploaded) {
			revert NotExceedUploadTime();
		}

		if (types == 0) {
			// A 重传 => 说明 B 的随机数是错的 => UnifiedInspection(msg.sender, other, index, 0) == false
			if (UnifiedInspection(msg.sender, other, index, 0)) revert RandomIsCorrect();
			if (info.riA == 0) revert RandomNotUploaded(); // 随机数未上传
			bool reA = (info.reuploadFlags & 0x01) != 0; // 没有重传过
			if (reA) revert RandomHasReuploaded();
			// A 自己的随机数要是正确 => UnifiedInspection(msg.sender, other, index, 1) == true
			if (!UnifiedInspection(msg.sender, other, index, 1)) revert SelfRandomNotCorrect();

			info.niA = ni;
			info.riA = ri;
			info.reuploadFlags |= 0x01;

			emit ReqReuploadNum(msg.sender, other, ni, ri, info.infoHashA, info.infoHashB);
		} else {
			// B 重传 => A 的随机数是错的 => UnifiedInspection(other, msg.sender, index, 1) == false
			if (UnifiedInspection(other, msg.sender, index, 1)) revert RandomIsCorrect();
			if (info.riB == 0) revert RandomNotUploaded();
			bool reB = (info.reuploadFlags & 0x02) != 0;
			if (reB) revert RandomHasReuploaded();
			// B 自己的随机数要正确 => UnifiedInspection(other, msg.sender, index, 0) == true
			if (!UnifiedInspection(other, msg.sender, index, 0)) revert SelfRandomNotCorrect();

			info.niB = ni;
			info.riB = ri;
			info.reuploadFlags |= 0x02;

			emit ResReuploadNum(msg.sender, other, ni, ri, info.infoHashA, info.infoHashB);
		}
	}

	/* ---------------------------------------------------------------------
       内部辅助函数
    --------------------------------------------------------------------- */
	// 验证公钥和地址对应关系（常见做法：截取公钥后64字节做 keccak256，再取最后20字节与地址比较）
	function _verifyPublicKey(bytes calldata publicKey, address addr) internal pure returns (bool) {
		// 公钥一般65字节: 0x04 + X(32) + Y(32)
		if (publicKey.length != 65) {
			return false;
		}

		bytes32 pubKeyHash = keccak256(publicKey[1:]); // 跳过第一个字节(0x04)，对后64字节做hash
		address derived = address(uint160(uint256(pubKeyHash)));
		return (derived == addr);
	}
}
