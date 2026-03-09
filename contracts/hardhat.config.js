require("@nomicfoundation/hardhat-toolbox");

// Load environment variables if .env file exists
let deployerPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat default account #0
let xdaiRpcUrl = "https://rpc.gnosischain.com";

try {
  require("dotenv").config();
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  }
  if (process.env.XDAI_RPC_URL) {
    xdaiRpcUrl = process.env.XDAI_RPC_URL;
  }
} catch (_) {
  // dotenv not installed – use defaults (fine for local dev / CI)
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Enable via-IR for improved gas optimisation (leverages Optimism's rollup savings)
      viaIR: true,
    },
  },
  networks: {
    // -------------------------------------------------------------------
    // Local development (hardhat node / hardhat test)
    // -------------------------------------------------------------------
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // -------------------------------------------------------------------
    // xDai / Gnosis Chain  (chain ID 100)
    // -------------------------------------------------------------------
    xdai: {
      url: xdaiRpcUrl,
      chainId: 100,
      accounts: [deployerPrivateKey],
      gasPrice: "auto",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
