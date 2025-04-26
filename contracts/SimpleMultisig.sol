// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SimpleMultisig {
    /* Core State Variables */
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public confirmations;

    /* Events */
    event Submit(uint256 indexed txIndex, address indexed owner);
    event Confirm(uint256 indexed txIndex, address indexed owner);
    event Revoke(uint256 indexed txIndex, address indexed owner);
    event Execute(uint256 indexed txIndex, address indexed owner);
    event OwnerAdded(address indexed newOwner);
    event OwnerRemoved(address indexed removedOwner);
    event ThresholdChanged(uint256 newThreshold);

    /* Constructor */
    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "No owners provided");
        require(_threshold > 0 && _threshold <= _owners.length, "Invalid threshold");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        threshold = _threshold;
    }

    /* Modifiers */
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    modifier txExists(uint256 _txIndex) {
        require(_txIndex < transactions.length, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        require(!transactions[_txIndex].executed, "Transaction already executed");
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        require(!confirmations[_txIndex][msg.sender], "Transaction already confirmed");
        _;
    }

    /* Core Multisig Functions */
    function submitTransaction(address _to, uint256 _value, bytes memory _data) public onlyOwner {
        transactions.push(Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numConfirmations: 0
        }));

        emit Submit(transactions.length - 1, msg.sender);
    }

    function confirmTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        confirmations[_txIndex][msg.sender] = true;
        transactions[_txIndex].numConfirmations += 1;

        emit Confirm(_txIndex, msg.sender);
    }

    function executeTransaction(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        require(transactions[_txIndex].numConfirmations >= threshold, "Cannot execute tx");

        Transaction storage transaction = transactions[_txIndex];
        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction failed");

        emit Execute(_txIndex, msg.sender);
    }

    function revokeConfirmation(uint256 _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        require(confirmations[_txIndex][msg.sender], "Tx not confirmed");

        confirmations[_txIndex][msg.sender] = false;
        transactions[_txIndex].numConfirmations -= 1;

        emit Revoke(_txIndex, msg.sender);
    }

    /* Owner Management - Public Functions */
    function addOwner(address _newOwner) 
        public 
        onlyOwner 
    {
        _addOwner(_newOwner);
    }

    function removeOwner(address _owner) 
        public 
        onlyOwner 
    {
        _removeOwner(_owner);
    }

    function changeThreshold(uint256 _newThreshold) 
        public 
        onlyOwner 
    {
        _changeThreshold(_newThreshold);
    }

    /* Owner Management - Internal Functions */
    function _addOwner(address _newOwner) internal {
        require(_newOwner != address(0), "Invalid owner");
        require(!isOwner[_newOwner], "Already an owner");

        isOwner[_newOwner] = true;
        owners.push(_newOwner);

        emit OwnerAdded(_newOwner);
    }

    function _removeOwner(address _owner) internal {
        require(isOwner[_owner], "Not an owner");

        isOwner[_owner] = false;

        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        if (threshold > owners.length) {
            _changeThreshold(owners.length);
        }

        emit OwnerRemoved(_owner);
    }

    function _changeThreshold(uint256 _newThreshold) internal {
        require(_newThreshold > 0 && _newThreshold <= owners.length, "Invalid threshold");
        threshold = _newThreshold;

        emit ThresholdChanged(_newThreshold);
    }

    /* Public Getters for Owner Management */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getTransaction(uint256 _txIndex)
        public
        view
        txExists(_txIndex)
        returns (address to, uint256 value, bytes memory data, bool executed, uint256 numConfirmations)
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }

    /* Accept ETH */
    receive() external payable {}
}
