// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./ERC20.sol";

// 在ERC20的基础上增加延时转账时间
contract LockERC20 is ERC20 {
	struct Lock {
		address sender; // 转账发起方
		address receiver; // 转账接收方
		uint timestamp; // 转入时间，解锁时间默认为当前时间增加2min
		uint amount; // 转账金额
		bool canceled; // 是否取消转账
	}
	// 不想让用户记录bytes32
	// 接收者 => 发送者 => 转账信息，需要用户知道谁转给他了，要知道发送者
	// mapping(address => mapping(address => bytes32[])) public locks;

	mapping(address => bytes32[]) public receiverLog; // 可能记录会有很多，只记录接收者未执行的转账
	mapping(bytes32 => Lock) public locks; // 转账信息hash => 转账信息

	// 记录lockid
	event Lockid(address from, address to, bytes32 lockid);

	// 构造函数
	constructor(
		string memory name_,
		string memory symbol_,
		uint256 totalSupply_
	) ERC20(name_, symbol_, totalSupply_) {}

	// 转账锁定，谁都可以调用
	function lockTransfer(address _receiver, uint _amount) public returns (bytes32) {
		// ERC20检查：0地址，余额是否足够
		require(msg.sender != address(0), "ERC20: transfer from the zero address");
		require(_receiver != address(0), "ERC20: transfer to the zero address");
		uint256 fromBalance = balanceOf(msg.sender);
		require(fromBalance >= _amount, "ERC20: transfer amount exceeds balance");
		// TimeLock检查：交易是否已经存在
		bytes32 lockId = keccak256(abi.encode(msg.sender, _receiver, block.timestamp, _amount));
		require(locks[lockId].sender == address(0), "lock id exists");

		Lock memory lock = Lock({
			sender: msg.sender,
			receiver: _receiver,
			timestamp: block.timestamp + 120,
			amount: _amount,
			canceled: false
		});
		locks[lockId] = lock;
		receiverLog[_receiver].push(lockId);

		_transfer(msg.sender, address(this), _amount); // 将代币转移到合约地址上
		emit Lockid(msg.sender, _receiver, lockId);
		// 返回值只能在solidity内部调用，ethers.js不能得到返回值，所以用event保存返回值
		return lockId;
	}

	// 解锁转账，谁都可以调用
	function unlockTransfer(bytes32 _lockId) public {
		Lock storage lock = locks[_lockId];
		// 交易存在、未被取消、交易已经解锁
		require(lock.sender != address(0), "lock id not exists");
		require(!lock.canceled, "transaction cancled");
		require(block.timestamp >= lock.timestamp, "locked transaction");

		_transfer(address(this), lock.receiver, lock.amount);

		bytes32[] storage logs = receiverLog[lock.receiver];
		// 删除已经执行过的记录
		uint len = logs.length;
		for (uint i = 0; i < len; i++)
			if (logs[i] == _lockId) {
				logs[i] = logs[len - 1];
				logs.pop();
				break;
			}
	}

	// 取消转账，只有转账发起者才可以调用
	function cancelTransfer(bytes32 _lockId) public {
		Lock storage lock = locks[_lockId];
		// 转账的发起人、转账没有被取消、没有超过解锁的时间
		require(lock.sender == msg.sender, "not the transfer initiator");
		require(!lock.canceled, "transaction cancled");
		require(block.timestamp < lock.timestamp, "unlocked transaction");

		_transfer(address(this), lock.sender, lock.amount); // 将代币返还给发起方

		lock.canceled = true;
	}

	function getReceiverLog(address addr) public view returns (bytes32[] memory) {
		return receiverLog[addr];
	}
}
