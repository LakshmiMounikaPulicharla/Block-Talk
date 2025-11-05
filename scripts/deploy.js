// scripts/deploy.js

const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");

  // 1️⃣ Deploy the UserRegistration contract
  const UserRegistration = await ethers.getContractFactory("UserRegistration");
  const userRegistration = await UserRegistration.deploy();
  await userRegistration.deployed();

  console.log("✅ UserRegistration deployed to:", userRegistration.address);

  // 2️⃣ Deploy the MessageStorage contract
  const MessageStorage = await ethers.getContractFactory("MessageStorage");
  const messageStorage = await MessageStorage.deploy(userRegistration.address);
  await messageStorage.deployed();

  console.log("✅ MessageStorage deployed to:", messageStorage.address);

  console.log("\n🎉 Deployment complete!");
  console.log("UserRegistration:", userRegistration.address);
  console.log("MessageStorage:", messageStorage.address);
}

// Run the script
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
