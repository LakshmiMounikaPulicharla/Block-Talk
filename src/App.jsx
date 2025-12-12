import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ConnectPage from "./pages/ConnectPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import FriendsPage from "./pages/FriendsPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import TopNavBar from "./pages/TopNavBar";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ConnectPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="*"
          element={
            <div
              style={{
                color: "white",
                textAlign: "center",
                marginTop: "100px",
                fontFamily: "Poppins, sans-serif",
              }}
            >
              <h2>404 ❌ Page Not Found</h2>
              <p>Go back to <a href="/" style={{ color: "#00eaff" }}>Home</a></p>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
