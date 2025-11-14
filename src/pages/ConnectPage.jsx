import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Web3Context } from "../context/Web3Context.jsx";
import "./pageTheme.css";

const ConnectPage = () => {
  const navigate = useNavigate();
  const { account, isConnected, connectWallet } = useContext(Web3Context);

  return (
    <section className="page-section">
      <header className="page-header">
        <h1>Connect Your Wallet</h1>
        <p>
          Link your Ethereum wallet to unlock encrypted messaging and personalized features
          across the CryptoComm network.
        </p>
      </header>

      <div className="content-grid single">
        <div className="glass-card focus">
          <div className="card-heading">
            <h2>Start Your Journey</h2>
            <p>
              Connect your MetaMask wallet to continue. Your wallet address will act as your
              secure on-chain identity.
            </p>
          </div>

          {!isConnected ? (
            <>
              <button className="primary-btn" onClick={connectWallet}>
                🦊 Connect MetaMask
              </button>
              <p className="list-subtitle">
                Ensure MetaMask is installed and unlocked before continuing.
              </p>
            </>
          ) : (
            <div className="connected-state">
              <p className="callout success">✅ Wallet Connected!</p>
              <p className="mono-text">
                Address: {account.slice(0, 6)}...{account.slice(-4)}
              </p>
              <button
                className="primary-btn"
                onClick={() => navigate("/register")}
              >
                Proceed to Register →
              </button>
            </div>
          )}

          {!window.ethereum && (
            <p className="callout error">
              🔴 MetaMask not detected. Install from{" "}
              <a
                href="https://metamask.io/download.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                metamask.io
              </a>
            </p>
          )}
        </div>

        <div className="glass-card secondary">
          <div className="card-heading">
            <h2>Why Connect?</h2>
          </div>
          <ul className="feature-list">
            <li>
              Access secure, end-to-end encrypted chat.
              <p className="list-subtitle">
                Your messages and connections stay fully decentralized.
              </p>
            </li>
            <li>
              Build your verified on-chain identity.
              <p className="list-subtitle">
                Your wallet address doubles as your login.
              </p>
            </li>
            <li>
              Get started with no passwords or centralized storage.
              <p className="list-subtitle">
                All your data remains in your control.
              </p>
            </li>
          </ul>

          <div className="metric-grid">
            <div className="metric-card">
              <strong>98%</strong>
              <span>Successful Wallet Connections</span>
              <p className="list-subtitle">Seamless onboarding via MetaMask</p>
            </div>
            <div className="metric-card">
              <strong>30s</strong>
              <span>Avg. Setup Time</span>
              <p className="list-subtitle">
                From connection to dashboard in under a minute
              </p>
            </div>
            <div className="metric-card">
              <strong>100%</strong>
              <span>User Ownership</span>
              <p className="list-subtitle">No centralized servers involved</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="page-footer">
        <p>Built with ❤️ • CryptoComm © 2025</p>
      </footer>
    </section>
  );
};

export default ConnectPage;
