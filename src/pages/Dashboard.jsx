import React, { useState, useEffect } from 'react';
import './pageTheme.css';
import TopNavBar from "./TopNavBar.jsx";

// --- 1. SIMPLIFIED TYPEWRITER (One-Shot) ---
// This component types ONCE and stops. It relies on the parent
// to unmount and remount it to "restart" the animation.
const Typewriter = ({ text, delay = 50, startDelay = 0 }) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    // Wait for startDelay
    const startTimeout = setTimeout(() => {
      let currentIndex = 0;
      
      // Start typing
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, delay);
      
      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [text, delay, startDelay]);

  return <span>{displayText}</span>;
};

// --- 2. DASHBOARD (The Master Controller) ---
function Dashboard() {
  // This state controls the global synchronization
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    // The Master Loop: Every 8000ms (8 seconds), increment the key.
    // This destroys and recreates the text components, forcing a perfect reset.
    const interval = setInterval(() => {
      setCycleKey(prev => prev + 1);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="terminal-page-wrapper">
      <div className="nav-wrapper-glass">
      <TopNavBar title="Dashboard"/>
      </div>
      <main className="terminal-content">
        
        {/* We use 'key={cycleKey}' here. When this changes, React re-renders 
            everything inside from scratch, syncing all start times. */}
        <div className="system-status" key={cycleKey}>
          
          {/* Main Title */}
          <h1>
            <span style={{ marginRight: '10px' }}>&gt;</span>
            <Typewriter 
              text="WELCOME TO BLOCK TALK" 
              delay={100} 
              startDelay={100} // Start almost immediately
            />
            <span className="blinking-cursor">_</span>
          </h1>

          {/* Status Lines */}
          <div className="status-lines">
            <p>
              <span className="status-active">
                <Typewriter 
                  text="TRANSPARENT" 
                  startDelay={1500} // Waits 1.5s
                />
              </span>
            </p>
            <p>
              <span className="status-active">
                <Typewriter 
                  text="DECENTRALISED" 
                  startDelay={2500} // Waits 2.5s
                />
              </span>
            </p>
            <p>
              <span className="status-active">
                <Typewriter 
                  text="PRIVATE" 
                  startDelay={3500} // Waits 3.5s
                />
              </span>
            </p>
            
            <br />
            
            <p className="status-comment">
              <Typewriter 
                text="Make Friends and Start Chatting Right Now !!!" 
                startDelay={4500} // Waits 4.5s
                delay={30}
              />
            </p>
          </div>
        </div>
      </main>
    </div> 
  );
}

export default Dashboard;