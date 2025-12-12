import React from "react";
import { useNavigate } from "react-router-dom";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { FaUser } from "react-icons/fa";
import { FaUserFriends } from "react-icons/fa";
import { IoHomeSharp } from "react-icons/io5";
import "./pageTheme.css";

const TopNavBar = ({ title = "Block-Talk" }) => {
  const navigate = useNavigate();

  return (
    <header className="nav-header glass-card">
      <div className="nav-inner">
        {/* Brand Section */}
        <div className="brand-wrap" onClick={() => navigate("/dashboard")}>
          <div className="avatar-circle small">BT</div>
          <h1 className="brand-name">{title}</h1>
        </div>

        {/* Navigation Links */}
        <nav className="nav-links">
          <button onClick={() => navigate("/dashboard")} className="nav-item">
            <span className="nav-icon"><IoHomeSharp /></span>
            <span className="nav-text">Dashboard</span>
          </button>
          <button onClick={() => navigate("/friends")} className="nav-item">
            <span className="nav-icon"><FaUserFriends /></span> 
            <span className="nav-text">Friends</span>
          </button>
          <button onClick={() => navigate("/chat")} className="nav-item">
            <span className="nav-icon"><IoChatbubbleEllipsesOutline /></span>
           <span className="nav-text">Chat</span>
          </button>
          <button onClick={() => navigate("/profile")} className="nav-item">
              <span className="nav-icon"><FaUser /></span>
              <span className="nav-text">Profile</span>
          </button>
        </nav>

        {/* Right Section (Wallet / Logout) */}
        <div className="nav-actions">
          <button className="logout-btn" onClick={() => navigate("/")}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNavBar;
