// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// 优化storage版本
contract FairIntegerV1 {
	/* ---------------------------------------------------------------------
       自定义错误 (可选) —— 比长字符串revert更节省字节码
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
	error SelfRandomIsNotCorrect();
	error NoAddressFound();
	error PublicKeyMismatch();

	/* ---------------------------------------------------------------------
       数据结构
    --------------------------------------------------------------------- */
	// 注意字段顺序和类型，以减少slot使用
	struct IntegerInfo {
		// 这两个 bytes32 各占1个slot
		bytes32 infoHashA;
		bytes32 infoHashB;
		// 以下字段因为都是uint256，因此每个各占1个slot
		uint256 hashTa;
		uint256 hashTb;
		uint256 niA;
		uint256 niB;
		uint256 riA;
		uint256 riB;
		// 将 tA, tB（用uint64）+ 1个uint8的“布尔标志位” 放在同一个slot
		uint64 tA;
		uint64 tB;
		uint8 reuploadFlags;
		// reuploadFlags:
		//   bit 0 => 是否已重传A
		//   bit 1 => 是否已重传B
	}

	// 这个结构只用两个slot:
	// slot1: address req (160 bits) + 96 bits空闲
	// slot2: address res (160 bits) + uint96 index
	struct hashIndexStruct {
		address req;
		address res;
		uint96 index;
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
		uint256 index
	);

	event ResHashUpload(
		address indexed from,
		address indexed to,
		bytes32 infoHashB,
		uint64 tA,
		uint64 tB,
		uint256 index
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
	// 用 uint64 替换 uint256，可以省一点gas
	mapping(address => uint64) private executeTime;

	// personalInteger[sender][receiver] 为一个动态数组
	mapping(address => mapping(address => IntegerInfo[])) private personalInteger;

	// 唯一 hash => 索引
	mapping(bytes32 => hashIndexStruct) internal hashIndex;

	// 账户激活
	mapping(uint256 => address) private indexToAddress;
	mapping(address => bytes) private addressToPublicKey;
	uint256 public count; // 已激活账户数

	// 把时间要求改为 `immutable`
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
		if (info.infoHashA == 0) revert RequesterHashMissing();
		if (info.infoHashB == 0) revert ResponderHashMissing();
		_;
	}

	// 判断该 hash 是否已存在
	modifier onlyNewHash(bytes32 infoHash) {
		if (infoHash == bytes32(0)) revert ZeroHash();
		if (hashIndex[infoHash].req != address(0)) revert HashAlreadyExists();
		_;
	}

	/* ---------------------------------------------------------------------
       账户激活相关
    --------------------------------------------------------------------- */
	function activateAccount(bytes32 /*sig*/, bytes memory publicKey) external {
		// 验证公钥
		if (!_verifyPublicKey(publicKey, msg.sender)) {
			revert PublicKeyMismatch();
		}
		indexToAddress[count] = msg.sender;
		addressToPublicKey[msg.sender] = publicKey;

		emit ActivateAccount(count, msg.sender, publicKey);
		count++;
	}

	function getAddressById(
		uint256 _index
	) external view returns (address account, bytes memory publicKey) {
		account = indexToAddress[_index];
		if (account == address(0)) revert NoAddressFound();
		publicKey = addressToPublicKey[account];
	}

	function getPublicKeyByAddress(address account) external view returns (bytes memory) {
		return addressToPublicKey[account];
	}

	/* ---------------------------------------------------------------------
       上传Hash阶段
    --------------------------------------------------------------------- */
	// 设置请求者的 infoHash（A）
	function setReqHash(address receiver, bytes32 mHash) external onlyNewHash(mHash) {
		uint256 len = personalInteger[msg.sender][receiver].length;

		// 如果之前有数据，检查前一条的B-hash是否已经上传或者已超时
		if (len != 0) {
			IntegerInfo storage prev = personalInteger[msg.sender][receiver][len - 1];
			if (prev.infoHashB == 0 && (prev.hashTa + hashTime >= block.timestamp)) {
				revert("last data not processed");
			}
		}

		// 新增一条记录
		IntegerInfo memory integerInfo;
		integerInfo.infoHashA = mHash;
		integerInfo.tA = executeTime[msg.sender];
		integerInfo.tB = executeTime[receiver];
		integerInfo.hashTa = block.timestamp;

		personalInteger[msg.sender][receiver].push(integerInfo);
		uint256 newIndex = personalInteger[msg.sender][receiver].length - 1;

		// 在全局hashIndex里记录
		hashIndex[mHash] = hashIndexStruct({
			req: msg.sender,
			res: receiver,
			index: uint96(newIndex)
		});

		emit ReqHashUpload(msg.sender, receiver, mHash, integerInfo.tA, integerInfo.tB, newIndex);
	}

	// 设置响应者的 infoHash（B）
	function setResHash(address sender, bytes32 mHash) external {
		if (mHash == bytes32(0)) revert ZeroHash();

		uint256 len = personalInteger[sender][msg.sender].length;
		if (len == 0) revert EmptyArray();

		IntegerInfo storage integerInfo = personalInteger[sender][msg.sender][len - 1];
		if (integerInfo.infoHashA == 0) revert RequesterHashMissing();
		if (integerInfo.infoHashB != 0) {
			revert("response message hash has existed");
		}

		if (integerInfo.hashTa + hashTime < block.timestamp) {
			revert HashTimeExpired();
		}

		integerInfo.infoHashB = mHash;
		integerInfo.hashTb = block.timestamp;

		hashIndex[mHash] = hashIndexStruct({
			req: sender,
			res: msg.sender,
			index: uint96(len - 1)
		});

		emit ResHashUpload(msg.sender, sender, mHash, integerInfo.tA, integerInfo.tB, len - 1);
	}

	/* ---------------------------------------------------------------------
       上传随机数阶段
    --------------------------------------------------------------------- */
	// 请求者上传 ni, ri
	function setReqInfo(
		address receiver,
		uint256 ni,
		uint256 ri
	) external validHash(msg.sender, receiver) {
		if (ri == 0) revert("ri is zero");

		uint256 len = personalInteger[msg.sender][receiver].length;
		IntegerInfo storage info = personalInteger[msg.sender][receiver][len - 1];
		if (info.riA != 0) revert NiRiAlreadySet();

		if (info.hashTb + numTime < block.timestamp) {
			revert NiRiTimeExpired();
		}

		info.niA = ni;
		info.riA = ri;
		executeTime[msg.sender]++;

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

	// 响应者上传 ni, ri
	function setResInfo(
		address sender,
		uint256 ni,
		uint256 ri
	) external validHash(sender, msg.sender) {
		if (ri == 0) revert("ri is zero");

		uint256 len = personalInteger[sender][msg.sender].length;
		IntegerInfo storage info = personalInteger[sender][msg.sender][len - 1];
		if (info.riB != 0) revert NiRiAlreadySet();

		if (info.hashTb + numTime < block.timestamp) {
			revert NiRiTimeExpired();
		}

		info.niB = ni;
		info.riB = ri;
		executeTime[msg.sender]++;

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
	function getReqExecuteTime(address receiver) external view returns (uint256, uint256, uint256) {
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

	// 返回指定索引处的随机数
	function showNum(
		address sender,
		address receiver,
		uint256 index
	) external view returns (uint256, uint256, bool, bool) {
		uint256 len = personalInteger[sender][receiver].length;
		if (index >= len) revert("error index");

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
	// types=0 => 检查对方（B）的随机数；types=1 => 检查自己（A）的随机数
	function UnifiedInspection(
		address from,
		address to,
		uint256 index,
		uint8 types
	) public view returns (bool) {
		IntegerInfo storage info = personalInteger[from][to][index];
		if (types == 0) {
			// 检查 B 的随机数是否正确 or 是否重传过
			bool reB = (info.reuploadFlags & 0x02) != 0;
			bytes32 hashB = keccak256(abi.encode(info.niB, info.tA, info.tB, info.riB));
			return (hashB == info.infoHashB || reB);
		} else {
			// 检查 A 的随机数是否正确 or 是否重传过
			bool reA = (info.reuploadFlags & 0x01) != 0;
			bytes32 hashA = keccak256(abi.encode(info.niA, info.tA, info.tB, info.riA));
			return (hashA == info.infoHashA || reA);
		}
	}

	// 重传随机数
	// types=0 => 重传A的随机数；types=1 => 重传B的随机数
	function reuploadNum(
		address other,
		uint256 index,
		uint8 types,
		uint256 ni,
		uint256 ri
	) external {
		if (types > 1) revert("wrong types");

		// 根据 types 判断是 A 还是 B 在调用
		IntegerInfo storage info = (
			types == 0
				? personalInteger[msg.sender][other][index]
				: personalInteger[other][msg.sender][index]
		);

		if (info.infoHashA == 0 || info.infoHashB == 0) {
			revert("requester or responder message hash not exists");
		}

		// 必须超过上传随机数阶段 or 双方都已经上传完成（才可以重传）
		bool timeExceeded = (info.hashTb + numTime < block.timestamp);
		bool bothUploaded = (info.riA != 0 && info.riB != 0);
		if (!timeExceeded && !bothUploaded) {
			revert("not exceed upload time");
		}

		// 分两种情况
		if (types == 0) {
			// A重传 => B的随机数是错的 => UnifiedInspection(msg.sender, other, index, 0)要是false
			if (UnifiedInspection(msg.sender, other, index, 0)) revert RandomIsCorrect();
			if (info.riA == 0) revert RandomNotUploaded();
			bool reA = (info.reuploadFlags & 0x01) != 0;
			if (reA) revert RandomHasReuploaded();
			// 同时 A 自己的随机数是对的 => UnifiedInspection(msg.sender, other, index, 1)要true
			if (!UnifiedInspection(msg.sender, other, index, 1)) revert SelfRandomIsNotCorrect();

			info.niA = ni;
			info.riA = ri;
			// 设置标志位 bit0
			info.reuploadFlags |= 0x01;

			emit ReqReuploadNum(msg.sender, other, ni, ri, info.infoHashA, info.infoHashB);
		} else {
			// B重传 => A的随机数是错的 => UnifiedInspection(other, msg.sender, index, 1)要false
			if (UnifiedInspection(other, msg.sender, index, 1)) revert RandomIsCorrect();
			if (info.riB == 0) revert RandomNotUploaded();
			bool reB = (info.reuploadFlags & 0x02) != 0;
			if (reB) revert RandomHasReuploaded();
			// 同时 B 自己的随机数要正确
			if (!UnifiedInspection(other, msg.sender, index, 0)) revert SelfRandomIsNotCorrect();

			info.niB = ni;
			info.riB = ri;
			// 设置标志位 bit1
			info.reuploadFlags |= 0x02;

			emit ResReuploadNum(msg.sender, other, ni, ri, info.infoHashA, info.infoHashB);
		}
	}

	/* ---------------------------------------------------------------------
       内部辅助函数
    --------------------------------------------------------------------- */
	// 验证公钥和地址对应关系
	function _verifyPublicKey(bytes memory publicKey, address addr) internal pure returns (bool) {
		// 未压缩的公钥通常为65字节(0x04 + X(32) + Y(32))
		if (publicKey.length != 65) {
			return false;
		}
		// 去掉 0x04 前缀
		bytes memory pubKeyNoPrefix = new bytes(64);
		for (uint i = 0; i < 64; i++) {
			pubKeyNoPrefix[i] = publicKey[i + 1];
		}
		bytes32 pubKeyHash = keccak256(pubKeyNoPrefix);
		// 取哈希最后20字节
		address derivedAddress = address(uint160(uint256(pubKeyHash)));
		return (derivedAddress == addr);
	}
}
