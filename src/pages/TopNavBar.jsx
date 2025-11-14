import React from "react";
import { useNavigate } from "react-router-dom";
import "./pageTheme.css";

const TopNavBar = ({ title = "CryptoComm" }) => {
  const navigate = useNavigate();

  return (
    <header className="nav-header glass-card">
      <div className="nav-inner">
        {/* Brand Section */}
        <div className="brand-wrap" onClick={() => navigate("/dashboard")}>
          <div className="avatar-circle small">CC</div>
          <h1 className="brand-name">{title}</h1>
        </div>

        {/* Navigation Links */}
        <nav className="nav-links">
          <button onClick={() => navigate("/dashboard")}>🏠 Dashboard</button>
          <button onClick={() => navigate("/friends")}>👥 Friends</button>
          <button onClick={() => navigate("/chat")}>💬 Chat</button>
          <button onClick={() => navigate("/profile")}>👤 Profile</button>
        </nav>

        {/* Right Section (Wallet / Logout) */}
        <div className="nav-actions">
          <button className="logout-btn" onClick={() => navigate("/")}>
            🚪 Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
