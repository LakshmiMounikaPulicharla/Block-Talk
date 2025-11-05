// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title User Registration Contract for cryptoComm
/// @notice Manages user registration and friend relationships for the decentralized chat system

contract UserRegistration {

    // Structure to represent a user
    struct User {
        string name;
        address userAddress;
        address[] friendList;
    }

    // Mapping from address to user data
    mapping(address => User) private userList;
    mapping(string => bool) public usernameTaken;
    // Array to store all registered users
    User[] private allUsers;

    // Events for frontend or off-chain listening
    event UserRegistered(address indexed userAddress, string username);
    event FriendAdded(address indexed user, address indexed friend);

    /// @notice Function to create a new user account
    /// @param _name The unique username chosen by the user
    function createAccount(string memory _name) public {
    // I. Check if user already exists
    require(bytes(userList[msg.sender].name).length == 0, "User already exists!");
    
    // II. Validate username
    bytes memory nameBytes = bytes(_name);
    require(nameBytes.length > 0, "Username cannot be empty!");
    require(nameBytes.length <= 32, "Username too long!"); // Add reasonable limit
    require(!usernameTaken[_name], "Username already taken!");
    
    // III. Register user
    userList[msg.sender] = User({
        name: _name,
        userAddress: msg.sender,
        friendList: new address[](0)  // Fixed initialization
    });
    
    // Mark username as taken
    usernameTaken[_name] = true;
    
    // Add to global user list
    allUsers.push(userList[msg.sender]);
    
    emit UserRegistered(msg.sender, _name);
}
    /// @notice Function to add a friend (bi-directional)
    /// @param _friendKey The Ethereum address of the friend to add
    function addFriend(address _friendKey) public {
        // i. Check that both users are registered
        require(bytes(userList[msg.sender].name).length != 0, "Create an account first!");
        require(bytes(userList[_friendKey].name).length != 0, "Friend not registered!");

        // ii. Prevent adding oneself
        require(msg.sender != _friendKey, "Cannot add yourself as a friend!");

        // iii. Prevent duplicate friendship
        require(!_isAlreadyFriend(msg.sender, _friendKey), "Already friends!");

        // Add friend both ways
        _addFriend(msg.sender, _friendKey);
        _addFriend(_friendKey, msg.sender);

        emit FriendAdded(msg.sender, _friendKey);
    }

    /// @notice Internal function to add a friend to the user's friend list
    function _addFriend(address user, address friendKey) internal {
        userList[user].friendList.push(friendKey);
    }

    /// @notice Checks if two users are already friends
    function _isAlreadyFriend(address user, address friendKey) internal view returns (bool) {
        address[] memory friends = userList[user].friendList;
        for (uint i = 0; i < friends.length; i++) {
            if (friends[i] == friendKey) {
                return true;
            }
        }
        return false;
    }

    /// @notice Returns user details (name, address, friend list)
    function getUser(address _userAddress) public view returns (string memory, address, address[] memory) {
        User memory u = userList[_userAddress];
        return (u.name, u.userAddress, u.friendList);
    }

    /// @notice Returns all registered users
    function getAllRegisteredUsers() public view returns (User[] memory) {
        return allUsers;
    }

    /// @notice Check if a user exists
    function userExists(address _userAddress) public view returns (bool) {
        return bytes(userList[_userAddress].name).length != 0;
    }
}
