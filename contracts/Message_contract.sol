// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Message Storage Contract for CryptoComm
/// @notice Handles secure storage and retrieval of both text and file messages between registered users.
/// @dev Implements end-to-end encryption support, friend validation, and message status tracking

interface IUserRegistration {
    function userExists(address _userAddress) external view returns (bool);
    function areFriends(address user1, address user2) external view returns (bool);
}

contract MessageStorage {

    // Structure to represent each message
    struct Message {
        address sender;         // Message sender
        uint256 timestamp;      // When the message was sent
        string message;         // Encrypted text or IPFS link
        string msgType;         // "text" or "file"
        bool isEncrypted;       // Flag indicating if message is encrypted
        uint8 status;           // Message status: 0=sent, 1=delivered, 2=read
    }

    // Reference to User Registration Contract
    address public userContractAddress;
    IUserRegistration private userContract;

    // Mapping to store all messages under a unique chat code
    mapping(bytes32 => Message[]) private allMessages;
    
    // Mapping for read receipts: chatCode => messageIndex => read timestamp
    mapping(bytes32 => mapping(uint256 => uint256)) public readReceipts;

    // Event to notify frontend when a new message is sent
    event MessageSent(
        address indexed from,
        address indexed to,
        bytes32 indexed chatCode,
        string message,
        string msgType,
        uint256 timestamp,
        bool isEncrypted
    );
    
    // Event for message status updates
    event MessageStatusUpdated(
        bytes32 indexed chatCode,
        uint256 indexed messageIndex,
        address indexed recipient,
        uint8 status,
        uint256 timestamp
    );

    /// @notice Constructor to set user contract address
    constructor(address _userContractAddress) {
        require(_userContractAddress != address(0), "Invalid user contract address!");
        userContractAddress = _userContractAddress;
        userContract = IUserRegistration(_userContractAddress);
    }

    /// @notice Internal helper to generate unique chat code between two users
    /// @param pubkey1 Address of first user
    /// @param pubkey2 Address of second user
    /// @return bytes32 Unique chat identifier
    function _getChatCode(address pubkey1, address pubkey2)
        internal
        pure
        returns (bytes32)
    {
        // Ensure consistent order for chat pairing
        if (pubkey1 < pubkey2) {
            return keccak256(abi.encodePacked(pubkey1, pubkey2));
        } else {
            return keccak256(abi.encodePacked(pubkey2, pubkey1));
        }
    }

    /// @notice Internal helper to check if two users are friends
    /// @dev Calls the user registration contract to verify friendship
    function _areFriends(address user1, address user2) internal view returns (bool) {
        return userContract.areFriends(user1, user2);
    }

    /// @notice Send a message (text or file link) to a friend
    /// @param _friendKey Ethereum address of the recipient
    /// @param _msg Message content (encrypted text or IPFS URL)
    /// @param _msgType Type of message — "text" or "file"
    /// @param _isEncrypted Whether the message is encrypted (true for text, false for IPFS links)
    function sendMessage(
        address _friendKey,
        string memory _msg,
        string memory _msgType,
        bool _isEncrypted
    ) public {
        require(_friendKey != address(0), "Invalid recipient address!");
        require(_friendKey != msg.sender, "Cannot send message to yourself!");
        require(bytes(_msg).length > 0, "Message cannot be empty!");
        require(userContract.userExists(msg.sender), "Sender not registered!");
        require(userContract.userExists(_friendKey), "Recipient not registered!");
        require(_areFriends(msg.sender, _friendKey), "Users must be friends to send messages!");
        require(
            keccak256(abi.encodePacked(_msgType)) == keccak256("text") ||
            keccak256(abi.encodePacked(_msgType)) == keccak256("file"),
            "Invalid message type!"
        );

        // Generate chat code for sender–receiver pair
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);

        // Create message struct with encryption flag
        Message memory newMsg = Message({
            sender: msg.sender,
            timestamp: block.timestamp,
            message: _msg,
            msgType: _msgType,
            isEncrypted: _isEncrypted,
            status: 0 // 0 = sent
        });

        // Store message under chat code
        allMessages[chatCode].push(newMsg);

        emit MessageSent(
            msg.sender,
            _friendKey,
            chatCode,
            _msg,
            _msgType,
            block.timestamp,
            _isEncrypted
        );
    }

    /// @notice Retrieve messages exchanged with a specific friend
    /// @param _friendKey Ethereum address of the friend
    /// @return Array of Message structs
    function readMessages(address _friendKey)
        public
        view
        returns (Message[] memory)
    {
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);
        return allMessages[chatCode];
    }

    /// @notice Get total number of messages in a chat
    /// @param _friendKey Ethereum address of the friend
    /// @return uint256 Message count
    function getMessageCount(address _friendKey)
        public
        view
        returns (uint256)
    {
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);
        return allMessages[chatCode].length;
    }

    /// @notice Get a single message by index (for pagination or debugging)
    /// @param _friendKey Ethereum address of the friend
    /// @param index Message index
    /// @return Message struct
    function getMessageByIndex(address _friendKey, uint256 index)
        public
        view
        returns (Message memory)
    {
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);
        require(index < allMessages[chatCode].length, "Index out of range");
        return allMessages[chatCode][index];
    }
    
    /// @notice Mark a message as read (updates status and records read receipt)
    /// @param _friendKey Ethereum address of the friend who sent the message
    /// @param messageIndex Index of the message to mark as read
    function markMessageAsRead(address _friendKey, uint256 messageIndex) public {
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);
        require(messageIndex < allMessages[chatCode].length, "Message index out of range");
        
        Message storage msgToUpdate = allMessages[chatCode][messageIndex];
        require(msgToUpdate.sender == _friendKey, "Can only mark messages from friend as read");
        require(msgToUpdate.status < 2, "Message already marked as read");
        
        // Update status to read (2)
        msgToUpdate.status = 2;
        
        // Record read receipt
        readReceipts[chatCode][messageIndex] = block.timestamp;
        
        emit MessageStatusUpdated(
            chatCode,
            messageIndex,
            msg.sender,
            2,
            block.timestamp
        );
    }
    
    /// @notice Mark a message as delivered (called when message is retrieved)
    /// @param _friendKey Ethereum address of the friend who sent the message
    /// @param messageIndex Index of the message to mark as delivered
    function markMessageAsDelivered(address _friendKey, uint256 messageIndex) public {
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);
        require(messageIndex < allMessages[chatCode].length, "Message index out of range");
        
        Message storage msgToUpdate = allMessages[chatCode][messageIndex];
        require(msgToUpdate.sender == _friendKey, "Can only mark messages from friend as delivered");
        require(msgToUpdate.status == 0, "Message status already updated");
        
        // Update status to delivered (1)
        msgToUpdate.status = 1;
        
        emit MessageStatusUpdated(
            chatCode,
            messageIndex,
            msg.sender,
            1,
            block.timestamp
        );
    }
    
    /// @notice Get read receipt timestamp for a specific message
    /// @param _friendKey Ethereum address of the friend
    /// @param messageIndex Index of the message
    /// @return Read timestamp (0 if not read)
    function getReadReceipt(address _friendKey, uint256 messageIndex)
        public
        view
        returns (uint256)
    {
        bytes32 chatCode = _getChatCode(msg.sender, _friendKey);
        return readReceipts[chatCode][messageIndex];
    }
}
