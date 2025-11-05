// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Message Storage Contract for cryptoComm
/// @notice Handles secure storage and retrieval of encrypted messages between registered users.

contract MessageStorage {

    // Structure to represent each message
    struct Message {
        address sender;
        uint256 timestamp;
        string message; // Encrypted message
    }

    // Reference to user registration contract
    address public userContractAddress;

    // Mapping to store all messages under a unique chat code
    mapping(bytes32 => Message[]) private allMessages;

    // Event to notify when a new message is sent
    event MessageSent(address indexed from, address indexed to, bytes32 indexed chatCode, string encryptedMessage);

    constructor(address _userContractAddress) {
        userContractAddress = _userContractAddress;
    }

    /// @notice Internal function to generate a unique chat code for a conversation
    /// @param pubkey1 Address of user 1
    /// @param pubkey2 Address of user 2
    /// @return bytes32 Unique chat code
    function _getChatCode(address pubkey1, address pubkey2) internal pure returns (bytes32) {
        // i. Generate unique chat code between two users
        // ii. Take two Ethereum addresses as parameters
        // iii. Hash them together using Keccak-256
        if (pubkey1 < pubkey2) {
            return keccak256(abi.encodePacked(pubkey1, pubkey2));
        } else {
            return keccak256(abi.encodePacked(pubkey2, pubkey1));
        }
    }

    /// @notice Send a private (encrypted) message to a friend
    /// @param _friendKey Ethereum address of the recipient
    /// @param _msg Encrypted message content
    function sendMessage(address _friendKey, string memory _msg) public {
        require(_friendKey != address(0), "Invalid recipient address!");
        require(bytes(_msg).length > 0, "Message cannot be empty!");

        // i. Check if sender and friend exist and are friends — external verification in frontend or user contract
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);

        // ii. Create message object
        Message memory newMsg = Message({
            sender: msg.sender,
            timestamp: block.timestamp,
            message: _msg
        });

        // iii. Store message under the generated chat code
        allMessages[chatCode].push(newMsg);

        emit MessageSent(msg.sender, _friendKey, chatCode, _msg);
    }

    /// @notice Read messages exchanged with a specific friend
    /// @param _friendKey Ethereum address of the friend
    /// @return Message[] Array of message structures
    function readMessages(address _friendKey) public view returns (Message[] memory) {
        // i. Generate the chat code for this conversation
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);

        // ii. Retrieve all messages associated with the chat code
        // iii. Return the array of messages to the caller
        return allMessages[chatCode];
    }
}
