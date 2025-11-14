// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title User Registration Contract for CryptoComm
/// @notice Manages user registration, username lookup, and friend relationships for the decentralized chat system.
contract UserRegistration {
    // Structure to represent a user
    struct User {
        string name;
        address userAddress;
        address[] friendList;
    }

    // 🔹 Mappings
    mapping(address => User) private userList;         // address → user details
    mapping(string => bool) public usernameTaken;      // username → taken flag
    mapping(string => address) public usernameToAddress; // ✅ username → wallet address mapping

    // Array to store all registered users
    User[] private allUsers;

    // 🔹 Events
    event UserRegistered(address indexed userAddress, string username);
    event FriendAdded(address indexed user, address indexed friend);
    event FriendRemoved(address indexed user, address indexed friend); // ✅ added event

    /// @notice Creates a new user account with a unique username
    /// @param _name The unique username chosen by the user
    function createAccount(string memory _name) public {
        // I. Check if user already exists
        require(bytes(userList[msg.sender].name).length == 0, "User already exists!");

        // II. Validate username
        bytes memory nameBytes = bytes(_name);
        require(nameBytes.length > 0, "Username cannot be empty!");
        require(nameBytes.length <= 32, "Username too long!");
        require(!usernameTaken[_name], "Username already taken!");

        // III. Register user
        userList[msg.sender] = User({
            name: _name,
            userAddress: msg.sender,
            friendList: new address[](0) 
        });

        // Mark username as taken and link to wallet address
        usernameTaken[_name] = true;
        usernameToAddress[_name] = msg.sender;

        // Add to global list
        allUsers.push(userList[msg.sender]);

        emit UserRegistered(msg.sender, _name);
    }

    /// @notice Adds a friend bi-directionally using their wallet address
    /// @param _friendKey The Ethereum address of the friend to add
    function addFriend(address _friendKey) public {
        require(bytes(userList[msg.sender].name).length != 0, "Create an account first!");
        require(bytes(userList[_friendKey].name).length != 0, "Friend not registered!");
        require(msg.sender != _friendKey, "Cannot add yourself as a friend!");
        require(!_isAlreadyFriend(msg.sender, _friendKey), "Already friends!");

        _addFriend(msg.sender, _friendKey);
        _addFriend(_friendKey, msg.sender);

        emit FriendAdded(msg.sender, _friendKey);
    }

    /// @notice Internal helper to add a friend to the list
    function _addFriend(address user, address friendKey) internal {
        userList[user].friendList.push(friendKey);
    }

    /// @notice Removes a friend bi-directionally
    /// @param _friendKey The Ethereum address of the friend to remove
    function removeFriend(address _friendKey) public {
        require(bytes(userList[msg.sender].name).length != 0, "Create an account first!");
        require(bytes(userList[_friendKey].name).length != 0, "Friend not registered!");
        require(msg.sender != _friendKey, "Cannot remove yourself!");
        require(_isAlreadyFriend(msg.sender, _friendKey), "Not friends yet!");

        // Remove from both sides
        _removeFriend(msg.sender, _friendKey);
        _removeFriend(_friendKey, msg.sender);

        emit FriendRemoved(msg.sender, _friendKey);
    }

    /// @notice Internal helper to remove friend from list
    function _removeFriend(address user, address friendKey) internal {
        address[] storage friends = userList[user].friendList;
        uint length = friends.length;

        for (uint i = 0; i < length; i++) {
            if (friends[i] == friendKey) {
                friends[i] = friends[length - 1];
                friends.pop();
                break;
            }
        }
    }

    /// @notice Checks if two users are already friends
    function _isAlreadyFriend(address user, address friendKey) internal view returns (bool) {
        address[] memory friends = userList[user].friendList;
        for (uint i = 0; i < friends.length; i++) {
            if (friends[i] == friendKey) return true;
        }
        return false;
    }
    
    /// @notice Public function to check if two users are friends
    /// @dev Exposed for Message contract to validate friendships
    function areFriends(address user1, address user2) public view returns (bool) {
        return _isAlreadyFriend(user1, user2) && _isAlreadyFriend(user2, user1);
    }

    /// @notice Returns user details (name, address, friend list) by wallet
    function getUser(address _userAddress)
        public
        view
        returns (string memory, address, address[] memory)
    {
        User memory u = userList[_userAddress];
        return (u.name, u.userAddress, u.friendList);
    }

    /// @notice Returns user details by username
    function getUserByUsername(string memory _username)
        public
        view
        returns (string memory, address, address[] memory)
    {
        address userAddr = usernameToAddress[_username];
        require(userAddr != address(0), "User not found!");
        User memory u = userList[userAddr];
        return (u.name, u.userAddress, u.friendList);
    }

    /// @notice Returns all registered users
    function getAllRegisteredUsers() public view returns (User[] memory) {
        return allUsers;
    }

    /// @notice Checks if a user exists by wallet address
    function userExists(address _userAddress) public view returns (bool) {
        return bytes(userList[_userAddress].name).length != 0;
    }
}
