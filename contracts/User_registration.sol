// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title User Registration Contract for CryptoComm
/// @notice Manages user registration, username lookup, friend relationships and friend-requests.
contract UserRegistration {
    // Structure to represent a user
    struct User {
        string name;
        address userAddress;
        address[] friendList;
    }

    // 🔹 Mappings
    mapping(address => User) private userList;                     // address → user details
    mapping(string => bool) public usernameTaken;                  // username → taken flag
    mapping(string => address) public usernameToAddress;           // username → wallet address mapping

    // --------------------------
    // FRIEND REQUEST STORAGE
    // --------------------------
    // public so Solidity generates handy getters returning address[] memory
    mapping(address => address[]) public sentRequests;    // requests SENT by a user
    mapping(address => address[]) public pendingRequests; // requests RECEIVED by a user (pending)

    // Array to store all registered users
    User[] private allUsers;

    // 🔹 Events
    event UserRegistered(address indexed userAddress, string username);
    event FriendAdded(address indexed user, address indexed friend);
    event FriendRemoved(address indexed user, address indexed friend);

    // Friend-request lifecycle
    event FriendRequestSent(address indexed from, address indexed to);
    event FriendRequestAccepted(address indexed from, address indexed to);
    event FriendRequestRejected(address indexed from, address indexed to);

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

    /// @notice Internal helper to add a friend to the list (one direction)
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


    // FRIEND REQUEST FUNCTIONS 

    /// @notice Send a friend request to another user
    /// @param _to Address of the user to send request to
    function sendFriendRequest(address _to) public {
        require(bytes(userList[msg.sender].name).length != 0, "You must register first!");
        require(bytes(userList[_to].name).length != 0, "User not registered!");
        require(msg.sender != _to, "Cannot send request to yourself!");
        require(!_isAlreadyFriend(msg.sender, _to), "Already friends!");
        require(!_exists(sentRequests[msg.sender], _to), "Request already sent!");
        require(!_exists(pendingRequests[msg.sender], _to), "User already sent you a request!");

        sentRequests[msg.sender].push(_to);
        pendingRequests[_to].push(msg.sender);

        emit FriendRequestSent(msg.sender, _to);
    }

    /// @notice Accept an incoming friend request (caller accepts request from _from)
    /// @param _from Address of the user who sent the request
    function acceptFriendRequest(address _from) public {
        require(_exists(pendingRequests[msg.sender], _from), "No request from this user!");
        require(!_isAlreadyFriend(msg.sender, _from), "Already friends!");

        // Add friendship both ways
        _addFriend(msg.sender, _from);
        _addFriend(_from, msg.sender);

        // Remove pending/sent entries
        _removeRequest(pendingRequests[msg.sender], _from);
        _removeRequest(sentRequests[_from], msg.sender);

        emit FriendRequestAccepted(_from, msg.sender);
        emit FriendAdded(msg.sender, _from);
    }
    
    /// @notice Cancel a friend request that YOU previously sent
    /// @param _to The address you sent the request to
    function cancelFriendRequest(address _to) public {
        require(_exists(sentRequests[msg.sender], _to), "No sent request to this user!");

        // Remove from the sender's sentRequests
        _removeRequest(sentRequests[msg.sender], _to);
       // Remove from receiver's pendingRequests
       _removeRequest(pendingRequests[_to], msg.sender);

       // Optional: you can emit a specific event if you want
       // emit FriendRequestRejected(msg.sender, _to);
    }

    /// @notice Reject an incoming friend request (caller rejects request from _from)
    /// @param _from Address of the user who sent the request
    function rejectFriendRequest(address _from) public {
        require(_exists(pendingRequests[msg.sender], _from), "No request from this user!");

        _removeRequest(pendingRequests[msg.sender], _from);
        _removeRequest(sentRequests[_from], msg.sender);

        emit FriendRequestRejected(_from, msg.sender);
    }

    // INTERNAL HELPERS

    /// @notice Checks whether an address exists in an address[] (memory)
    function _exists(address[] memory arr, address user) internal pure returns (bool) {
        for (uint i = 0; i < arr.length; i++) {
            if (arr[i] == user) return true;
        }
        return false;
    }

    /// @notice Removes the first occurrence of `user` from a storage array by swapping with last and pop
    function _removeRequest(address[] storage arr, address user) internal {
        uint len = arr.length;
        for (uint i = 0; i < len; i++) {
            if (arr[i] == user) {
                arr[i] = arr[len - 1];
                arr.pop();
                break;
            }
        }
    }

    // READ / VIEW FUNCTIONS

    /// @notice Returns user details (name, address, friend list) by wallet
    function getUser(address _userAddress)
        public
        view
        returns (string memory, address, address[] memory)
    {
        User memory u = userList[_userAddress];
        return (u.name, u.userAddress, u.friendList);
    }

    /// @notice Returns user details by username (using the mapping)
    /// @param _username The username to search
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

    /// @notice Utility getters for pending/sent requests (these are auto-generated if mapping public, but included for clarity)
    function getPendingRequests(address _user) public view returns (address[] memory) {
        return pendingRequests[_user];
    }

    function getSentRequests(address _user) public view returns (address[] memory) {
        return sentRequests[_user];
    }
}
