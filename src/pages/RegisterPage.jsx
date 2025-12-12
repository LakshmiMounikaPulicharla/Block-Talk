import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { Web3Context } from "../context/Web3Context.jsx";
import TopNavBar from "./TopNavBar.jsx";
import userABI from "../utils/userABI.json";
import "./pageTheme.css";

const RegisterPage = () => {
  const { account, isConnected, connectWallet } = useContext(Web3Context);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const navigate = useNavigate();

  // ✅ Replace with your deployed contract address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // 🔍 Check if user already exists
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!isConnected || !account) return;
      try {
        const network = { chainId: 31337, name: "hardhat" };
        const provider = new ethers.BrowserProvider(window.ethereum, network);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, userABI, signer);

        // Use current block number to avoid MetaMask cache issues
        const currentBlock = await provider.getBlockNumber();
        const code = await provider.getCode(contractAddress, currentBlock);
        if (code === "0x") {
          console.error("❌ Contract not found at address:", contractAddress);
          console.error("💡 Please deploy contracts first: npx hardhat run scripts/deploy.cjs --network localhost");
          alert(`Contract not found!\n\nPlease deploy contracts:\nnpx hardhat run scripts/deploy.cjs --network localhost`);
          return;
        }
        console.log("✅ Contract found at address:", contractAddress);

        try {
          const exists = await contract.userExists(account);
          if (exists) {
            setAlreadyRegistered(true);
            setTimeout(() => navigate("/dashboard"), 1500);
          }
        } catch (userCheckError) {
          // If userExists fails (might be first time), that's okay - user can register
          console.warn("Could not check user status:", userCheckError.message);
          // Don't set alreadyRegistered - let user try to register
        }
      } catch (err) {
        console.error("Error checking user:", err);
      }
    };
    checkUserStatus();
  }, [isConnected, account, navigate]);

  // 🧩 Register user
  const registerUser = async () => {
    if (!isConnected) return alert("Please connect your wallet first!");
    if (username.trim() === "") return alert("Please enter a username!");

    try {
      setLoading(true);
      
      // Check if MetaMask is connected and on correct network
      if (!window.ethereum) {
        alert("MetaMask not found! Please install MetaMask.");
        return;
      }

      // Check network BEFORE creating provider
      let currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      currentChainId = parseInt(currentChainId, 16); // Convert hex to decimal
      
      console.log("Current MetaMask Chain ID:", currentChainId);
      
      if (currentChainId !== 31337) {
        const networkName = currentChainId === 1 ? 'Ethereum Mainnet' : `Chain ID ${currentChainId}`;
        const userWantsToSwitch = confirm(
          `Wrong network detected!\n\nCurrent: ${networkName}\nRequired: Hardhat Local (Chain ID: 31337)\n\nClick OK to switch to Hardhat Local network.`
        );
        
        if (userWantsToSwitch) {
          try {
            // Try to switch network
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x7a69' }], // 0x7a69 = 31337 in hex
            });
            // Reload page after switching
            window.location.reload();
            return;
          } catch (switchError) {
            // If network doesn't exist, add it
            if (switchError.code === 4902 || switchError.code === -32603) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x7a69', // 31337 in hex
                    chainName: 'Hardhat Local',
                    nativeCurrency: {
                      name: 'Ethereum',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: ['http://127.0.0.1:8545'],
                    blockExplorerUrls: null
                  }]
                });
                window.location.reload();
                return;
              } catch (addError) {
                alert(`Failed to add network. Please manually add Hardhat Local network:\n- Network Name: Hardhat Local\n- RPC URL: http://127.0.0.1:8545\n- Chain ID: 31337`);
                return;
              }
            } else {
              alert(`Failed to switch network. Please manually switch to Hardhat Local in MetaMask.`);
              return;
            }
          }
        } else {
          alert("Please switch to Hardhat Local network (Chain ID: 31337) to continue.");
          return;
        }
      }
      
      // Now create provider after network is confirmed
      const network = { chainId: 31337, name: "hardhat" };
      const provider = new ethers.BrowserProvider(window.ethereum, network);
      
      // Verify network again
      const networkDetails = await provider.getNetwork();
      const chainId = Number(networkDetails.chainId);
      console.log("✅ Network confirmed:", chainId);
      
      if (chainId !== 31337) {
        throw new Error(`Network verification failed! Chain ID: ${chainId}. Please ensure MetaMask is on Hardhat Local (Chain ID: 31337) and RPC URL is: http://127.0.0.1:8545`);
      }

      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, userABI, signer);

      // Check if contract exists at address (use specific block number to avoid MetaMask cache issues)
      const blockNumber = await provider.getBlockNumber();
      const code = await provider.getCode(contractAddress, blockNumber);
      if (code === "0x") {
        alert(`Contract not found at ${contractAddress}!\nPlease deploy contracts first:\nnpx hardhat run scripts/deploy.cjs --network localhost`);
        return;
      }

      // Verify account
      const currentAccount = await signer.getAddress();
      console.log("📝 Attempting registration:");
      console.log("  - Username:", username);
      console.log("  - Contract address:", contractAddress);
      console.log("  - Account from context:", account);
      console.log("  - Account from signer:", currentAccount);
      
      // Double-check network before transaction
      const finalNetwork = await provider.getNetwork();
      console.log("  - Final Chain ID check:", Number(finalNetwork.chainId));
      
      if (Number(finalNetwork.chainId) !== 31337) {
        throw new Error(`Still on wrong network! Chain ID: ${Number(finalNetwork.chainId)}. Please switch to Hardhat Local (31337) in MetaMask.`);
      }

      console.log("⏳ Sending transaction...");
      const tx = await contract.createAccount(username);
      console.log("✅ Transaction sent! Hash:", tx.hash);
      console.log("⏳ Waiting for confirmation...");
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed! Block:", receipt.blockNumber);

      alert("Registration successful!");
      navigate("/dashboard");
    } catch (error) {
      console.error("❌ Registration error:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data,
        stack: error.stack
      });

      // Check for specific error messages
      const errorMsg = error.message || error.reason || String(error);
      
      if (errorMsg.includes("User already exists") || errorMsg.includes("User already exists!"))
        alert("This account already exists!");
      else if (errorMsg.includes("Username already taken") || errorMsg.includes("Username already taken!"))
        alert("This username is already taken!");
      else if (errorMsg.includes("Username cannot be empty"))
        alert("Username cannot be empty!");
      else if (errorMsg.includes("Username too long"))
        alert("Username too long! Maximum 32 characters.");
      else if (errorMsg.includes("user rejected") || errorMsg.includes("denied"))
        alert("Transaction rejected. Please approve in MetaMask.");
      else if (errorMsg.includes("network") || errorMsg.includes("chain"))
        alert(`Network error! Make sure you're on Hardhat Local network (Chain ID: 31337).\n\nError: ${errorMsg}`);
      else {
        // Show more detailed error
        const shortError = errorMsg.length > 100 ? errorMsg.substring(0, 100) + "..." : errorMsg;
        alert(`Registration failed!\n\nError: ${shortError}\n\nCheck browser console (F12) for full details.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-background-wrapper bg-register">
      <section className="page-section">
      {/*<TopNavBar/>*/}
      <header className="page-header">
        <h1>Create Your Block-Talk Account</h1>
        <p>
          Register your decentralized identity to join the Block-Talk network.
          Your profile and data are securely stored on the blockchain.
        </p>
      </header>

      <div className="content-grid dual">
        {/* Registration Form Card */}
        <div className="glass-card focus form-card">
          <div className="card-heading">
            <h2>Register on Block-Talk</h2>
            <p>Choose a unique username to create your account.</p>
          </div>

          {!isConnected ? (
            <button className="primary-btn" onClick={connectWallet}>
               Connect MetaMask
            </button>
          ) : (
            <div className="wallet-chip">
              ✅ Connected: {account.slice(2, 6)}xXXXx{account.slice(-4)}
            </div>
          )}

          {alreadyRegistered ? (
            <p className="callout success">
               You’re already registered! Redirecting to Dashboard...

            </p>
          ) : (
            <>
              <div className="form-field">
                <span>Username</span>
                <input
                  type="text"
                  placeholder="Enter your unique username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <button
                className="primary-btn"
                onClick={registerUser}
                disabled={loading || !isConnected}
              >
                {loading ? "Registering..." : "Create Account"}
              </button>

              <p className="note list-subtitle">
                Once registered, your username is stored permanently on-chain.
              </p>
            </>
          )}
        </div>

        {/* Info / Tips Card */}
        <div className="glass-card tertiary">
          <img src="src\assets\Gemini_Generated_Image_ezpkv2ezpkv2ezpk.png" alt="Register Illustration" className="info-image" />
        </div>
      </div>

      {/*<footer className="page-footer">
        <p>Powered by Ethereum • Built with ❤️ by Block-Talk</p>
      </footer>*/}
    </section>
    </div>
  );
};

export default RegisterPage;
