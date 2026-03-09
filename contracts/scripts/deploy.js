/**
 * SuperChainerC20Token – deployment script
 *
 * Usage:
 *   Local node:  npx hardhat run scripts/deploy.js --network localhost
 *   xDai:        npx hardhat run scripts/deploy.js --network xdai
 *
 * Environment variables (optional – defaults shown):
 *   TOKEN_NAME          Name of the token           (default: "SuperChainerC20 Token")
 *   TOKEN_SYMBOL        Symbol of the token         (default: "SCC20")
 *   INITIAL_SUPPLY      Tokens minted at deploy     (default: 100000000, i.e. full cap)
 *   SUPERCHAIN_BRIDGE   Bridge predeploy address    (default: Optimism predeploy 0x4200…0028)
 */

const { ethers } = require("hardhat");

// Optimism canonical SuperchainTokenBridge predeploy address (all OP-Stack chains).
const DEFAULT_BRIDGE = "0x4200000000000000000000000000000000000028";

async function main() {
  const [deployer] = await ethers.getSigners();

  const tokenName = process.env.TOKEN_NAME || "SuperChainerC20 Token";
  const tokenSymbol = process.env.TOKEN_SYMBOL || "SCC20";
  // Default: mint the full 100,000,000 supply to the deployer.
  const initialSupply = process.env.INITIAL_SUPPLY
    ? ethers.parseUnits(process.env.INITIAL_SUPPLY, 18)
    : ethers.parseUnits("100000000", 18);
  const bridgeAddress = process.env.SUPERCHAIN_BRIDGE || DEFAULT_BRIDGE;

  console.log("=".repeat(60));
  console.log("Deploying SuperChainerC20Token");
  console.log("=".repeat(60));
  console.log(`  Deployer:       ${deployer.address}`);
  console.log(`  Token name:     ${tokenName}`);
  console.log(`  Token symbol:   ${tokenSymbol}`);
  console.log(`  Initial supply: ${ethers.formatUnits(initialSupply, 18)} ${tokenSymbol}`);
  console.log(`  Bridge address: ${bridgeAddress}`);
  console.log("-".repeat(60));

  const SuperChainerC20Token = await ethers.getContractFactory("SuperChainerC20Token");
  const token = await SuperChainerC20Token.deploy(
    tokenName,
    tokenSymbol,
    initialSupply,
    bridgeAddress
  );

  await token.waitForDeployment();

  const address = await token.getAddress();

  console.log(`  Contract deployed at: ${address}`);
  console.log("=".repeat(60));
  console.log("Deployment complete!");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Verify on block explorer:");
  console.log(
    `     npx hardhat verify --network xdai ${address} "${tokenName}" "${tokenSymbol}" "${initialSupply.toString()}" "${bridgeAddress}"`
  );
  console.log("  2. Update your .env / front-end config with the contract address.");

  return { address, token };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
