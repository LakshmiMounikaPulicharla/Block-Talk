import React, { createContext, useEffect, useState } from "react";
import { ethers } from "ethers";

// ✅ Create the context
export const Web3Context = createContext();

// ✅ Create the provider component
export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // 🔹 Initialize MetaMask connection
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      // Check and switch to Hardhat Local network (Chain ID 31337)
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const hardhatChainId = '0x7a69'; // 31337 in hex
        
        if (chainId !== hardhatChainId) {
          console.log(`Current network: ${chainId}, Switching to Hardhat Local: ${hardhatChainId}`);
          
          try {
            // Try to switch to Hardhat Local
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: hardhatChainId }],
            });
            console.log("✅ Switched to Hardhat Local network");
          } catch (switchError) {
            // If network doesn't exist, add it
            if (switchError.code === 4902 || switchError.code === -32603) {
              console.log("Hardhat Local network not found, adding it...");
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: hardhatChainId,
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
              console.log("✅ Added Hardhat Local network");
            } else {
              throw switchError;
            }
          }
        } else {
          console.log("✅ Already on Hardhat Local network");
        }
      } catch (networkError) {
        console.error("Network switch error:", networkError);
        alert("Please manually add Hardhat Local network in MetaMask:\n\nNetwork Name: Hardhat Local\nRPC URL: http://127.0.0.1:8545\nChain ID: 31337\nCurrency: ETH");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum); // ethers v6
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const signer = await provider.getSigner();

      // Verify we're on the correct network
      const network = await provider.getNetwork();
      console.log("Connected network Chain ID:", Number(network.chainId));
      
      if (Number(network.chainId) !== 31337) {
        alert(`Warning: Connected to Chain ID ${network.chainId}, but Hardhat Local is Chain ID 31337.\n\nPlease switch networks in MetaMask.`);
      }

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setIsConnected(true);
      console.log("✅ Connected account:", accounts[0]);
    } catch (error) {
      console.error("MetaMask connection failed:", error);
      alert("Failed to connect wallet. Please try again.\n\nMake sure:\n1. Hardhat node is running (npx hardhat node)\n2. MetaMask is unlocked\n3. You approve the connection");
    }
  };

  // 🔹 Check if MetaMask already connected
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          setProvider(provider);
          setSigner(signer);
          setAccount(accounts[0].address || accounts[0]);
          setIsConnected(true);
        }
      }
    };
    checkConnection();

    // 🔹 Listen for account/network changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          setIsConnected(true);
        } else {
          setAccount(null);
          setIsConnected(false);
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        isConnected,
        connectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
