import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ethers } from "ethers";
import lighthouse from "@lighthouse-web3/sdk";
import { Web3Context } from "../context/Web3Context.jsx";
import messageABI from "../utils/messageABI.json";
import userABI from "../utils/userABI.json";
import { encryptMessageForRecipient, decryptMessageFromSender, isEncrypted } from "../utils/encryption.js";
import "./ChatPage.css";

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { account, isConnected, connectWallet } = useContext(Web3Context);
  const chatEndRef = useRef(null);

  const userContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const messageContractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const [friends, setFriends] = useState([]);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");


  // 🔹 Helper: get contract
  const getContract = async (address, abi) => {
    const network = { chainId: 31337, name: "hardhat" };
    const provider = new ethers.BrowserProvider(window.ethereum, network);
    const signer = await provider.getSigner();
    return new ethers.Contract(address, abi, signer);
  };

  // 🔹 Fetch friends
  const fetchFriends = async () => {
    if (!isConnected || !account) return;
    try {
      const userContract = await getContract(userContractAddress, userABI);
      const [_, __, friendList] = await userContract.getUser(account);

      const formattedFriends = await Promise.all(
        friendList.map(async (f, i) => {
          try {
            const [friendName] = await userContract.getUser(f);
            return { id: i + 1, name: friendName || `Friend ${i + 1}`, address: f };
          } catch {
            return { id: i + 1, name: `Friend ${i + 1}`, address: f };
          }
        })
      );

      setFriends(formattedFriends);
      setFilteredFriends(formattedFriends);

      if (location.state?.friend) {
        const existing = formattedFriends.find(
          (f) => f.address.toLowerCase() === location.state.friend.toLowerCase()
        );
        setSelectedFriend(existing || { name: "Unknown", address: location.state.friend });
      } else if (formattedFriends.length > 0) {
        setSelectedFriend(formattedFriends[0]);
      }
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };
// 🔹 Fetch current user's username
const fetchCurrentUser = async () => {
  if (!isConnected || !account) return;
  try {
    const network = { chainId: 31337, name: "hardhat" };
    const provider = new ethers.BrowserProvider(window.ethereum, network);
    const signer = await provider.getSigner();
    const userContract = new ethers.Contract(userContractAddress, userABI, signer);

    const [userName] = await userContract.getUser(account);
    setCurrentUserName(userName);
  } catch (err) {
    console.error("Error fetching current user:", err);
  }
};

  // 🔹 Filter friends
  useEffect(() => {
    if (search.trim() === "") setFilteredFriends(friends);
    else {
      const lower = search.toLowerCase();
      setFilteredFriends(
        friends.filter(
          (f) =>
            f.name.toLowerCase().includes(lower) ||
            f.address.toLowerCase().includes(lower)
        )
      );
    }
  }, [search, friends]);

  // 🔹 Fetch messages
  const fetchMessages = async () => {
    if (!isConnected || !selectedFriend?.address) return;
    try {
      setLoading(true);
      const messageContract = await getContract(messageContractAddress, messageABI);
      const onchainMessages = await messageContract.readMessages(selectedFriend.address);

      // Process messages with decryption
      const formatted = await Promise.all(
        onchainMessages.map(async (m, i) => {
          let messageText = m.message;
          
          // Decrypt if message is encrypted and it's from friend
          if (m.isEncrypted && m.sender.toLowerCase() !== account.toLowerCase()) {
            console.log("DECRYPTION:");
            console.log("Ciphertext (from blockchain):", m.message.substring(0, 50) + "...");
            try {
              messageText = await decryptMessageFromSender(
                m.message,
                account,
                m.sender
              );
              console.log("Plaintext (decrypted):", messageText);
              console.log(" Decryption successful!");
            } catch (decryptError) {
              console.error("Decryption failed for message:", i, decryptError);
              messageText = "🔒 [Encrypted message - decryption failed]";
            }
          } else if (m.isEncrypted && m.sender.toLowerCase() === account.toLowerCase()) {
            // Messages we sent are already stored encrypted, try to decrypt for display
            console.log("DECRYPTION(sent message):");
            console.log(" Ciphertext (from blockchain):", m.message.substring(0, 50) + "...");
            try {
              messageText = await decryptMessageFromSender(
                m.message,
                account,
                selectedFriend.address
              );
              console.log("Plaintext (decrypted for display):", messageText);
            } catch (decryptError) {
              // If decryption fails, keep encrypted text
              messageText = m.message;
              console.warn(" Could not decrypt own message");
            }
          }

          // Mark as delivered when fetching (optional - disabled due to contract issues)
          // Status updates are non-critical - messages work without them
          // if (m.sender.toLowerCase() !== account.toLowerCase() && m.status < 1) {
          //   try {
          //     const tx = await messageContract.markMessageAsDelivered(
          //       selectedFriend.address,
          //       i
          //     );
          //     await tx.wait();
          //   } catch (statusError) {
          //     // Silently fail - status updates are optional
          //   }
          // }

          return {
            id: i + 1,
            sender: m.sender.toLowerCase() === account.toLowerCase() ? "me" : "friend",
            text: messageText,
            type: m.msgType || "text",
            status: m.status || 0, // 0=sent, 1=delivered, 2=read
            isEncrypted: m.isEncrypted || false,
            time: new Date(Number(m.timestamp) * 1000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
        })
      );

      setMessages(formatted);
      
      // Auto-mark new messages as read when displayed (optional - disabled due to contract issues)
      // Status updates are non-critical - messages work without them
      // formatted.forEach(async (msg, idx) => {
      //   if (msg.sender === "friend" && msg.status < 2) {
      //     try {
      //       const tx = await messageContract.markMessageAsRead(
      //         selectedFriend.address,
      //         idx
      //       );
      //       await tx.wait();
      //     } catch (statusError) {
      //       // Silently fail - status updates are optional
      //     }
      //   }
      // });
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Send text
  const sendMessage = async () => {
    if (!isConnected) return alert("Connect your wallet first!");
    if (newMessage.trim() === "") return alert("Message cannot be empty!");
    if (!selectedFriend?.address) return alert("Select a friend first!");

    try {
      setLoading(true);
      const messageContract = await getContract(messageContractAddress, messageABI);
      
      // Encrypt message before sending
      console.log("ENCRYPTION:");
      console.log("Plaintext:", newMessage);
      
      let encryptedMessage;
      try {
        encryptedMessage = await encryptMessageForRecipient(
          newMessage,
          account,
          selectedFriend.address
        );
        console.log(" Ciphertext (encrypted):", encryptedMessage);
        console.log(" Length: Plaintext =", newMessage.length, "chars, Ciphertext =", encryptedMessage.length, "chars");
      } catch (encryptError) {
        console.error("Encryption failed:", encryptError);
        alert("Failed to encrypt message. Please try again.");
        return;
      }

      // Send encrypted message to blockchain
      console.log(" Sending ciphertext to blockchain...");
      const tx = await messageContract.sendMessage(
        selectedFriend.address,
        encryptedMessage,
        "text",
        true // isEncrypted = true
      );
      await tx.wait();

      setNewMessage("");
      await fetchMessages();
    } catch (error) {
      console.error("Send message failed:", error);
      if (error.message && error.message.includes("Users must be friends")) {
        alert("You must be friends to send messages!");
      } else {
        alert("Transaction failed. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Upload + send file
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!selectedFriend?.address) return alert("Select a friend first!");

    try {
      setLoading(true);
      const output = await lighthouse.upload([file], import.meta.env.VITE_LIGHTHOUSE_API_KEY);
      const fileLink = `https://gateway.lighthouse.storage/ipfs/${output.data.Hash}`;

      const messageContract = await getContract(messageContractAddress, messageABI);
      // File links on IPFS are not encrypted (IPFS handles storage)
      const tx = await messageContract.sendMessage(
        selectedFriend.address,
        fileLink,
        "file",
        false // isEncrypted = false (IPFS link, not encrypted)
      );
      await tx.wait();

      alert("📁 File sent successfully!");
      await fetchMessages();
    } catch (error) {
      console.error("File upload failed:", error);
      alert("File upload or transaction failed!");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 File download handler
  const downloadFile = async (ipfsUrl) => {
    try {
      const response = await fetch(ipfsUrl);
      const blob = await response.blob();

      const filename = decodeURIComponent(ipfsUrl.split("/").pop());
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("⚠️ Failed to download file.");
    }
  };

  // 🔹 Fetch metadata for a file
  const fetchMetadata = async (ipfsUrl) => {
    try {
      const response = await fetch(ipfsUrl, { method: "HEAD" });
      const size = parseInt(response.headers.get("content-length") || "0", 10);
      const type = response.headers.get("content-type") || "unknown";
      const name = decodeURIComponent(ipfsUrl.split("/").pop());
      return { name, size: formatBytes(size), type };
    } catch {
      return null;
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 🔹 Scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔹 Initial load
  useEffect(() => {
    if (isConnected) 
      fetchCurrentUser();
      fetchFriends();
  }, [isConnected, account]);

  useEffect(() => {
    if (selectedFriend) fetchMessages();
  }, [selectedFriend]);

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <aside className="chat-sidebar">
        <div className="sidebar-header">
      <div className="profile-avatar" onClick={() => navigate("/profile")} title="View Profile">
       {currentUserName ? currentUserName[0].toUpperCase() : "U"}
      </div>
      <h2>💬 Chats</h2>
     <button className="friends-btn" onClick={() => navigate("/friends")}>
      👥 Friends
    </button>
    </div>


        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search friends..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {!isConnected ? (
          <button onClick={connectWallet} className="connect-btn">🔗 Connect MetaMask</button>
        ) : filteredFriends.length === 0 ? (
          <p>No friends yet.</p>
        ) : (
          <ul className="friend-list">
            {filteredFriends.map((f) => (
              <li
                key={f.id}
                className={`friend-item ${selectedFriend?.address === f.address ? "active" : ""}`}
                onClick={() => setSelectedFriend(f)}
              >
                <p className="friend-name">{f.name}</p>
                <p className="friend-address">
                  {f.address.slice(0, 6)}...{f.address.slice(-4)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main Chat */}
      <main className="chat-main">
        {selectedFriend ? (
          <>
            <header className="chat-header">
              <div className="chat-friend-info">
                <h3>{selectedFriend.name}</h3>
                <p className="chat-address">{selectedFriend.address}</p>
              </div>
              <button onClick={() => navigate("/dashboard")} className="exit-btn">
                ⬅ Dashboard
              </button>
            </header>

            <div className="chat-messages">
              {loading ? (
                <p>⏳ Loading messages...</p>
              ) : messages.length > 0 ? (
                messages.map((m) => (
                  <div key={m.id} className={`message ${m.sender === "me" ? "sent" : "received"}`}>
                    {m.type === "file" ? (
                      <FileBubble
                        ipfsUrl={m.text}
                        fetchMetadata={fetchMetadata}
                        downloadFile={downloadFile}
                      />
                    ) : (
                      <>
                        <p className="message-text">{m.text}</p>
                        {m.isEncrypted && (
                          <span className="encryption-badge" title="End-to-end encrypted">
                            🔒
                          </span>
                        )}
                      </>
                    )}
                    <div className="message-footer">
                      <span className="message-time">{m.time}</span>
                      {m.sender === "me" && (
                        <span className="message-status">
                          {m.status === 2 ? "✓✓" : m.status === 1 ? "✓" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p>No messages yet. Start chatting!</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input">
              <label htmlFor="file-upload" className="file-label" title="Attach file">📎</label>
              <input id="file-upload" type="file" onChange={handleFileUpload} accept="*" />
              <input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button className="send-btn" onClick={sendMessage} disabled={loading}>📩</button>
            </div>
          </>
        ) : (
          <div className="no-chat">
            <p>Select a friend to start chatting 💬</p>
          </div>
        )}
      </main>
    </div>
  );
};

// 🔹 Component for file messages
const FileBubble = ({ ipfsUrl, fetchMetadata, downloadFile }) => {
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      setLoading(true);
      const info = await fetchMetadata(ipfsUrl);
      setMeta(info);
      setLoading(false);
    };
    loadMeta();
  }, [ipfsUrl]);

  return (
    <div className="file-bubble">
      <h4><strong>📎 File</strong></h4>
      {loading || !meta ? (
        <p>Loading file info...</p>
      ) : (
        <>
          <p>{meta.type} • {meta.size}</p>
          <div className="file-actions">
            <a href={ipfsUrl} target="_blank" rel="noopener noreferrer" className="secondary-btn">Open</a>
            <button className="primary-btn" onClick={() => downloadFile(ipfsUrl)}>Download</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPage;
