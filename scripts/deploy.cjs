const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment...");

  // Deploy UserRegistration
  const UserRegistration = await hre.ethers.getContractFactory("UserRegistration");
  const userRegistration = await UserRegistration.deploy();
  await userRegistration.waitForDeployment(); // ✅ v6 syntax

  const userAddress = await userRegistration.getAddress();
  console.log("✅ UserRegistration deployed to:", userAddress);

  // Deploy MessageStorage (pass user contract address)
  const MessageStorage = await hre.ethers.getContractFactory("MessageStorage");
  const messageStorage = await MessageStorage.deploy(userAddress);
  await messageStorage.waitForDeployment(); // ✅ v6 syntax

  const messageAddress = await messageStorage.getAddress();
  console.log("✅ MessageStorage deployed to:", messageAddress);

  console.log("\n🎉 Deployment complete!");
  console.log("UserRegistration:", userAddress);
  console.log("MessageStorage:", messageAddress);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
