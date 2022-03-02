// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

contract Ownable {
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    address private _owner;

    modifier onlyOwner() {
        require(
            _owner == msg.sender,
            "Ownable: only onwer can call this function."
        );
        _;
    }

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: new oner can't be the rezo address"
        );
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}
