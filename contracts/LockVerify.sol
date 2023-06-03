// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./LockERC20.sol";
import "./VerifySig.sol";

// 暂存代币、验证签名
contract LockVerify is LockERC20, VerifySig {
	// ERC20的构造函数
	constructor(
		string memory name_,
		string memory symbol_,
		uint256 totalSupply_
	) LockERC20(name_, symbol_, totalSupply_) {}

	// set签名需要加上暂存代币到合约地址
	function setSigAndLock(address receiver, bytes32 c, bytes32 deblindHash, bytes32 mHash) public {
		bytes32 lockId = lockTransfer(receiver, 10 ether);
		setRequestSig(receiver, c, deblindHash, mHash, lockId);
	}

	// 验证签名并解锁代币
	// 通过verifyconsistency检查: 没有返回签名、签名是错的、输入验证的签名与链上不一致
	// 是否能有返回值？
	function vrifySigAndUnLock(VerifyInfo memory info) public returns (string memory) {
		// 验证数据一致性
		info.px = uint(SigPubKey[info.receiver].pkx);
		info.py = uint(SigPubKey[info.receiver].pky);
		bytes32 sigHash = getSigHash(info);
		if (!verifyconsistency(sigHash)) return "false data";
		// 已解锁
		uint index = SigIndex[sigHash] - 1; // 记录的下标是在原来基础上+1
		bytes32 lockId = Sig[info.sender][info.receiver][index].lockId;
		console.log("hasExecuted():", getHasExecuted(lockId));
		if (getHasExecuted(lockId)) return "true signature and has unlocked";

		// 未解锁    已经验证成功的就不再验证？？？
		string memory result = verifySig(info);
		// 验证成功
		if (keccak256(abi.encodePacked(result)) == keccak256(abi.encodePacked("true signature"))) {
			// 将暂存金额转到B账户
			/*  
            // try catch必须为外部调用, unlockTransfer()只能被当前合约调用, 可见性为internal. 二者冲突
			try this.unlockTransfer(lockId) {
				return "true signature and transfer to singer";
			} catch Error(string memory reason) {
				return string.concat("true signature but ", reason);
			} catch {
				return "true signature and unlock fail";
			} */
			unlockTransfer(lockId);
			return "true signature and transfer to signer";
		} else {
			// 将暂存金额转回A账户
			unlockTransferBack(lockId);
			return "false signature and transfer back to requester";
		}
	}
}
