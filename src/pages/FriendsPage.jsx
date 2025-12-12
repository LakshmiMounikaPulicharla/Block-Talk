import React, { useState, useEffect, useMemo, useContext } from "react";
import { ethers } from "ethers";
import { useNavigate } from "react-router-dom";
import { Web3Context } from "../context/Web3Context.jsx";
import userABI from "../utils/userABI.json";
import TopNavBar from "./TopNavBar.jsx";
import "./pageTheme.css";

const FriendsPage = () => {
  const { account, isConnected, connectWallet } = useContext(Web3Context);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState([]);
  const [pendingIncoming, setPendingIncoming] = useState([]); // [{username, address}]
  const [pendingSent, setPendingSent] = useState([]); // [{username, address}]
  const [searchResult, setSearchResult] = useState(null); // { username, address }
  const [loading, setLoading] = useState(false);

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // helper: get signer contract
  const getContract = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, userABI, signer);
  };

  // fetch friends list
  const fetchFriends = async () => {
    if (!isConnected || !account) return;
    try {
      setLoading(true);
      const contract = await getContract();
      const [_, __, friendList] = await contract.getUser(account);

      const friendData = await Promise.all(
        friendList.map(async (addr, i) => {
          try {
            const [name] = await contract.getUser(addr);
            return { id: i + 1, username: name || "Unknown", address: addr };
          } catch {
            return { id: i + 1, username: "Unknown", address: addr };
          }
        })
      );

      setFriends(friendData);
    } catch (err) {
      console.error("fetchFriends error:", err);
    } finally {
      setLoading(false);
    }
  };

  // fetch pending incoming & sent requests
  const fetchPending = async () => {
    if (!isConnected || !account) return;
    try {
      const contract = await getContract();

      // pending incoming
      let incoming = [];
      try {
        const incomingAddrs = await contract.getPendingRequests(account);
        incoming = await Promise.all(
          incomingAddrs.map(async (addr) => {
            try {
              const [name] = await contract.getUser(addr);
              return { username: name || "Unknown", address: addr };
            } catch {
              return { username: "Unknown", address: addr };
            }
          })
        );
      } catch (e) {
        // If contract doesn't expose getPendingRequests, set empty
        incoming = [];
      }

      // sent requests
      let sent = [];
      try {
        const sentAddrs = await contract.getSentRequests(account);
        sent = await Promise.all(
          sentAddrs.map(async (addr) => {
            try {
              const [name] = await contract.getUser(addr);
              return { username: name || "Unknown", address: addr };
            } catch {
              return { username: "Unknown", address: addr };
            }
          })
        );
      } catch (e) {
        sent = [];
      }

      setPendingIncoming(incoming);
      setPendingSent(sent);
    } catch (err) {
      console.error("fetchPending error:", err);
    }
  };

  // search by username or address
  const handleSearch = async () => {
    if (!isConnected) return alert("Please connect your wallet first!");
    if (query.trim() === "") return alert("Enter a username or address!");

    try {
      setLoading(true);
      const contract = await getContract();

      let friendAddress;

      if (ethers.isAddress(query)) {
        friendAddress = ethers.getAddress(query);
      } else {
        // try username -> address mapping
        try {
          friendAddress = await contract.usernameToAddress(query);
        } catch (err) {
          friendAddress = ethers.ZeroAddress;
        }
        if (!friendAddress || friendAddress === ethers.ZeroAddress) {
          alert("❌ User not found with that username!");
          setSearchResult(null);
          return;
        }
      }

      const [friendName] = await contract.getUser(friendAddress);
      setSearchResult({ username: friendName || "Unnamed", address: friendAddress });
    } catch (err) {
      console.error("Search failed:", err);
      alert("Something went wrong during search.");
    } finally {
      setLoading(false);
    }
  };

  // send friend request
  const handleSendRequest = async (addr) => {
    if (!isConnected) return alert("Connect wallet first!");
    const target = addr || (searchResult && searchResult.address);
    if (!target) return alert("No address to send request to!");

    try {
      setLoading(true);
      const contract = await getContract();
      const tx = await contract.sendFriendRequest(target);
      await tx.wait();
      alert("📨 Friend request sent!");
      setSearchResult(null);
      setQuery("");
      await fetchPending();
    } catch (err) {
      console.error("sendFriendRequest error:", err);
      // common revert messages
      if (err?.message?.includes("Request already sent")) {
        alert("You already sent a request to this user.");
      } else if (err?.message?.includes("Already friends")) {
        alert("You are already friends with this user.");
      } else {
        alert("Failed to send request. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  // accept incoming request
  const acceptRequest = async (fromAddr) => {
    if (!isConnected) return alert("Connect wallet first!");
    try {
      setLoading(true);
      const contract = await getContract();
      const tx = await contract.acceptFriendRequest(fromAddr);
      await tx.wait();
      alert("✔ Friend request accepted!");
      await fetchFriends();
      await fetchPending();
    } catch (err) {
      console.error("acceptRequest error:", err);
      alert("Failed to accept request.");
    } finally {
      setLoading(false);
    }
  };

  // reject incoming request
  const rejectRequest = async (fromAddr) => {
    if (!isConnected) return alert("Connect wallet first!");
    try {
      setLoading(true);
      const contract = await getContract();
      const tx = await contract.rejectFriendRequest(fromAddr);
      await tx.wait();
      alert("✖ Friend request rejected.");
      await fetchPending();
    } catch (err) {
      console.error("rejectRequest error:", err);
      alert("Failed to reject request.");
    } finally {
      setLoading(false);
    }
  };

  // cancel a sent request (if contract supports cancelFriendRequest)
  const cancelSentRequest = async (toAddr) => {
  if (!isConnected) return alert("Connect wallet first!");
  try {
    setLoading(true);
    const contract = await getContract();
    const tx = await contract.cancelFriendRequest(toAddr);
    await tx.wait();
    alert("Cancelled sent request.");
    await fetchPending();
  } catch (err) {
    console.error("cancelSentRequest error:", err);
    alert("Failed to cancel request.");
  } finally {
    setLoading(false);
  }
};


  // remove friend (unfriend)
  const handleRemoveFriend = async (friendAddr) => {
    if (!isConnected) return alert("Connect wallet first!");
    try {
      const confirm = window.confirm("Are you sure you want to remove this friend?");
      if (!confirm) return;
      setLoading(true);
      const contract = await getContract();
      const tx = await contract.removeFriend(friendAddr);
      await tx.wait();
      alert("Friend removed.");
      await fetchFriends();
    } catch (err) {
      console.error("removeFriend error:", err);
      alert("Failed to remove friend.");
    } finally {
      setLoading(false);
    }
  };

  // when clicking a friend -> open chat
  const openChat = (friend) => {
    navigate("/chat", { state: { friend: friend.address, friendName: friend.username } });
  };

  // derived filtered friends for search within existing friends
  const filteredFriends = useMemo(() => {
    if (!query.trim()) return friends;
    const q = query.toLowerCase().trim();
    return friends.filter((f) => f.username.toLowerCase().includes(q) || f.address.toLowerCase().includes(q));
  }, [query, friends]);

  // initial loads
  useEffect(() => {
    if (isConnected) {
      fetchFriends();
      fetchPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  return (
    <div className="page-background-wrapper bg-friends" >
      <section className="page-section">
      <TopNavBar title="Friends" />

      <header className="page-header">
        <h1>Find and Manage Friends</h1>
        <p>Send requests, accept incoming ones, and start chatting when both accept.</p>
      </header>

      {!isConnected ? (
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button className="primary-btn" onClick={connectWallet}>🔗 Connect MetaMask</button>
        </div>
      ) : (
        <div className="content-grid dual">
          {/* Friends list */}
          <div className="glass-card focus">
            <div className="card-heading">
              <h2>Your Friends</h2>
              <p>Tap to chat or remove a friend.</p>
            </div>

            {loading ? (
              <p>⏳ Loading...</p>
            ) : friends.length > 0 ? (
              <ul className="user-list clickable-list">
                {filteredFriends.map((f) => (
                  <li key={f.address} className="clickable-item">
                    <div className="friend-info" onClick={() => openChat(f)}>
                      <strong>@{f.username}</strong>
                      <span className="mono-text">{f.address}</span>
                    </div>
                    <div className="friend-actions">
                      <button className="pill subtle" onClick={() => openChat(f)}>💬 Chat</button>
                      <button className="pill danger" onClick={() => handleRemoveFriend(f.address)}>🗑 Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No friends added yet.</p>
            )}

            {/* Incoming pending requests preview (small) */}
             <div className="pending-section" style={{ marginTop: 18 }}>
              <h3>Incoming Requests</h3>
              {pendingIncoming.length ? (
                <ul className="pending-list">
                  {pendingIncoming.map((p) => (
                    <li key={p.address} className="pending-item">
                      <div className="pending-info">
                        <strong>@{p.username}</strong>
                        <span className="pending-address mono-text">{p.address}</span>
                      </div>
                      <div className="friend-actions">
                        <button className="pill accept-btn" onClick={() => acceptRequest(p.address)}>✔</button>
                        <button className="pill reject-btn" onClick={() => rejectRequest(p.address)}>✖</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No incoming requests.</p>
              )}
            </div>
          </div>

          {/* Search/Add & Pending management card */}
          <div className="glass-card secondary">
            <div className="card-heading">
              <h2>Search & Add Friends</h2>
              <p>Lookup by username or wallet address and send a Friend Request.</p>
            </div>

            <div className="form-field" style={{ gap: 8 }}>
              <input
                placeholder="Search username or paste address"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="primary-btn" onClick={handleSearch} disabled={loading}>🔍 Search</button>
            </div>

            {searchResult && (
              <div className="search-result glass-card pop-card" style={{ marginTop: 12 }}>
                <div className="result-info">
                  <div className="avatar-circle small-accent">{searchResult.username?.charAt(0)?.toUpperCase()}</div>
                  <div className="result-details">
                    <h3>@{searchResult.username}</h3>
                    <p className="address-text mono-text">{searchResult.address}</p>
                  </div>
                </div>

                <div className="result-actions">
                  {/* decide which action to show based on state */}
                  {/* if already friend -> disabled */}
                  {/* if sent -> show cancel */}
                  {/* else show send request */}
                  {friends.find((f) => f.address.toLowerCase() === searchResult.address.toLowerCase()) ? (
                    <button className="primary-btn" disabled>✓ Friends</button>
                  ) : pendingSent.find((s) => s.address.toLowerCase() === searchResult.address.toLowerCase()) ? (
                    <button className="pill reject-btn" onClick={() => cancelSentRequest(searchResult.address)}>✖ Cancel Request</button>
                  ) : pendingIncoming.find((p) => p.address.toLowerCase() === searchResult.address.toLowerCase()) ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="pill accept-btn" onClick={() => acceptRequest(searchResult.address)}>✔ Accept</button>
                      <button className="pill reject-btn" onClick={() => rejectRequest(searchResult.address)}>✖ Reject</button>
                    </div>
                  ) : (
                    <button className="primary-btn" onClick={() => handleSendRequest(searchResult.address)} disabled={loading}>
                      {loading ? "⏳ Sending..." : "Send Request"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sent Requests */}
            <div className="pending-section" style={{ marginTop: 18 }}>
              <h3>Pending Requests</h3>
              {pendingSent.length ? (
                <ul className="pending-list">
                  {pendingSent.map((p) => (
                    <li key={p.address} className="pending-item">
                      <div className="pending-info">
                        <strong>@{p.username}</strong>
                        <span className="pending-address mono-text">{p.address}</span>
                      </div>
                      <div className="pending-actions">
                        <button className="pill reject-btn" onClick={() => cancelSentRequest(p.address)}>Cancel</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No requests sent.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
    </div>
  );
};

export default FriendsPage;
