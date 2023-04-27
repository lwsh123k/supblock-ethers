// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20 is IERC20, Ownable {
	mapping(address => uint256) private _balances;
	mapping(address => mapping(address => uint256)) private _allowances;

	uint256 private _totalSupply;
	string private _name;
	string private _symbol;

	constructor(string memory name_, string memory symbol_, uint256 totalSupply_) {
		_name = name_;
		_symbol = symbol_;
		_mint(msg.sender, totalSupply_);
	}

	function name() public view virtual returns (string memory) {
		return _name;
	}

	function symbol() public view virtual returns (string memory) {
		return _symbol;
	}

	function decimals() public view virtual returns (uint8) {
		return 18;
	}

	function totalSupply() public view virtual override returns (uint256) {
		return _totalSupply;
	}

	function balanceOf(address account) public view virtual override returns (uint256) {
		return _balances[account];
	}

	function transfer(address to, uint256 amount) public virtual override returns (bool) {
		_transfer(msg.sender, to, amount);
		emit Transfer(msg.sender, to, amount);
		return true;
	}

	function allowance(
		address owner,
		address spender
	) public view virtual override returns (uint256) {
		return _allowances[owner][spender];
	}

	function approve(address spender, uint256 amount) public virtual override returns (bool) {
		_approve(msg.sender, spender, amount);
		return true;
	}

	//  花别人授予的钱
	function transferFrom(
		address from,
		address to,
		uint256 amount
	) public virtual override returns (bool) {
		// require(to != address(0), "to is zero address!");
		// require(from != address(0), "from is zero address!");
		uint currentAllowance = allowance(from, msg.sender);
		require(currentAllowance >= amount, "allowance < amount");
		// require(_balances[from] >= amount, "balance < amount");

		_approve(from, msg.sender, currentAllowance - amount);
		_transfer(from, to, amount);
		emit Transfer(from, to, amount);
		return true;
	}

	// 铸币
	function mint(address to, uint256 amount) public onlyOwner {
		_mint(to, amount);
	}

	function _mint(address account, uint256 amount) internal virtual {
		require(account != address(0), "ERC20: mint to the zero address");
		_totalSupply += amount;
		unchecked {
			// Overflow not possible: balance + amount is at most totalSupply + amount,
			// which is checked above.
			_balances[account] += amount;
		}
		emit Transfer(address(0), account, amount);
	}

	// 授予别人花多少钱
	function _approve(address owner, address spender, uint256 amount) internal virtual {
		require(owner != address(0), "ERC20: approve from the zero address");
		require(spender != address(0), "ERC20: approve to the zero address");

		_allowances[owner][spender] = amount;
		emit Approval(owner, spender, amount);
	}

	// transfer转账
	function _transfer(address from, address to, uint256 amount) internal virtual {
		require(from != address(0), "ERC20: transfer from the zero address");
		require(to != address(0), "ERC20: transfer to the zero address");

		uint256 fromBalance = _balances[from];
		require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
		unchecked {
			_balances[from] = fromBalance - amount;
			// Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
			// decrementing then incrementing.
			_balances[to] += amount;
		}

		emit Transfer(from, to, amount);
	}
}
