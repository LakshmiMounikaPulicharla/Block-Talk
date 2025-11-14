import React, { useEffect, useState, useMemo, useContext } from "react";
import { ethers } from "ethers";
import { Web3Context } from "../context/Web3Context.jsx";
import userABI from "../utils/userABI.json";
import TopNavBar from "./TopNavBar.jsx";
import "./pageTheme.css";

const ProfilePage = () => {
  const { account, isConnected, connectWallet } = useContext(Web3Context);

  const [username, setUsername] = useState("");
  const [friendCount, setFriendCount] = useState(0);
  const [joinedDate, setJoinedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [userAddress, setUserAddress] = useState("");

  // Replace with your deployed UserRegistration address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // 🔹 Connect to the blockchain contract
  const getContract = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, userABI, signer);
  };

  // 🧩 Fetch user details
  const fetchUserData = async () => {
    if (!isConnected || !account) return;
    try {
      setLoading(true);
      const contract = await getContract();

      const [name, userAddr, friends] = await contract.getUser(account);

      setUsername(name || "Unnamed");
      setFriendCount(friends.length || 0);
      setUserAddress(userAddr);
      setJoinedDate(new Date().toLocaleDateString());
    } catch (error) {
      console.error("Error fetching user:", error);
      alert("⚠️ Unable to fetch user data. Are you registered?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchUserData();
    }
  }, [isConnected, account]);

  const initials = useMemo(() => {
    if (!username) return "";
    const words = username.split(" ");
    return words.length > 1
      ? (words[0][0] + words[1][0]).toUpperCase()
      : words[0][0].toUpperCase();
  }, [username]);

  return (
    <section className="page-section">
      <TopNavBar title="Profile"/>
      <header className="page-header">
        <h1>Your Profile</h1>
        <p>Manage your identity and on-chain footprint on CryptoComm.</p>
      </header>

      {!isConnected ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <button className="primary-btn" onClick={connectWallet}>
            🔗 Connect MetaMask
          </button>
        </div>
      ) : (
        <div className="content-grid">
          <div className="glass-card focus profile-card">
            <div className="profile-header">
              <div className="avatar-circle">{initials}</div>
              <div>
                <h2>{username}</h2>
                <p>@{account?.slice(0, 6)}...{account?.slice(-4)}</p>
                <p className="list-subtitle">
                  {loading
                    ? "Loading from blockchain..."
                    : "Profile synced with smart contract"}
                </p>
              </div>
              <button type="button" className="secondary-btn" onClick={fetchUserData}>
                🔄 Refresh
              </button>
            </div>

            <dl className="profile-meta">
              <div>
                <dt>Wallet Address</dt>
                <dd className="mono-text">
                  {userAddress || "Not Available"}
                </dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{joinedDate}</dd>
              </div>
              <div>
                <dt>Friends</dt>
                <dd>{friendCount}</dd>
              </div>
              <div>
                <dt>Account Type</dt>
                <dd>Standard User</dd>
              </div>
              <div>
                <dt>Connected Network</dt>
                <dd>Local Hardhat (ChainId: 31337)</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProfilePage;
