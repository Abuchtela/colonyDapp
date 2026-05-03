/**
 * SuperChainerC20Token – Hardhat / Chai test suite
 *
 * Covers:
 *  - Deployment & initial state
 *  - ERC-20 standard behaviour (transfer, approve, transferFrom)
 *  - 2% fee on every regular transfer (sent to owner)
 *  - Fee-free mints and burns
 *  - Hard supply cap (MAX_SUPPLY = 100,000,000 tokens)
 *  - crosschainMint / crosschainBurn (ISuperchainERC20 / ERC-7802)
 *  - Owner-only admin: mint(), setSuperchainBridge()
 *  - supportsInterface (ERC-165)
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// ─── helpers ─────────────────────────────────────────────────────────────────

const toWei = (n) => ethers.parseUnits(String(n), 18);
const MAX_SUPPLY = toWei("100000000"); // 100 million tokens

// Canonical Optimism SuperchainTokenBridge predeploy
const DEFAULT_BRIDGE = "0x4200000000000000000000000000000000000028";

// ─── shared fixture ───────────────────────────────────────────────────────────

async function deployFixture() {
  const [owner, bridge, alice, bob, carol] = await ethers.getSigners();

  const SuperChainerC20Token = await ethers.getContractFactory("SuperChainerC20Token");

  // Deploy with the full 100 M initial supply minted to the owner
  const token = await SuperChainerC20Token.deploy(
    "SuperChainerC20 Token",
    "SCC20",
    MAX_SUPPLY,
    bridge.address // use a controllable signer as bridge in tests
  );

  await token.waitForDeployment();

  return { token, owner, bridge, alice, bob, carol };
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe("SuperChainerC20Token", function () {
  // ── 1. Deployment ──────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("SuperChainerC20 Token");
      expect(await token.symbol()).to.equal("SCC20");
    });

    it("should have 18 decimals", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.decimals()).to.equal(18);
    });

    it("should mint the full initial supply to the owner", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
      expect(await token.balanceOf(owner.address)).to.equal(MAX_SUPPLY);
    });

    it("should record the correct initial token value (100 USD cents = $1)", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.INITIAL_TOKEN_VALUE_USD_CENTS()).to.equal(100);
    });

    it("should set the correct superchainBridge address", async function () {
      const { token, bridge } = await loadFixture(deployFixture);
      expect(await token.superchainBridge()).to.equal(bridge.address);
    });

    it("should set the deployer as owner", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("should expose MAX_SUPPLY of 100,000,000 tokens", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("should expose fee constants: 2 / 100", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.FEE_NUMERATOR()).to.equal(2);
      expect(await token.FEE_DENOMINATOR()).to.equal(100);
    });

    it("should revert when initialSupply exceeds MAX_SUPPLY", async function () {
      const SuperChainerC20Token = await ethers.getContractFactory("SuperChainerC20Token");
      await expect(
        SuperChainerC20Token.deploy(
          "T",
          "T",
          MAX_SUPPLY + 1n,
          DEFAULT_BRIDGE
        )
      ).to.be.revertedWith("Initial supply exceeds max supply");
    });

    it("should revert when bridge address is zero", async function () {
      const SuperChainerC20Token = await ethers.getContractFactory("SuperChainerC20Token");
      await expect(
        SuperChainerC20Token.deploy("T", "T", 0, ethers.ZeroAddress)
      ).to.be.revertedWith("Bridge address cannot be zero");
    });

    it("should allow deployment with zero initial supply", async function () {
      const SuperChainerC20Token = await ethers.getContractFactory("SuperChainerC20Token");
      const token = await SuperChainerC20Token.deploy("T", "T", 0, DEFAULT_BRIDGE);
      expect(await token.totalSupply()).to.equal(0);
    });
  });

  // ── 2. 2% Transaction Fee ──────────────────────────────────────────────────
  describe("2% Transaction Fee", function () {
    it("should deduct a 2% fee from the transferred amount", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);

      const transferAmount = toWei("1000");
      const expectedFee = toWei("20"); // 2%
      const expectedNet = toWei("980"); // 98%

      const aliceBalBefore = await token.balanceOf(alice.address);
      const ownerBalBefore = await token.balanceOf(owner.address);

      await token.connect(owner).transfer(alice.address, transferAmount);

      expect(await token.balanceOf(alice.address)).to.equal(aliceBalBefore + expectedNet);
      // Owner sent `transferAmount` but received the fee back → net change = -netAmount
      expect(await token.balanceOf(owner.address)).to.equal(
        ownerBalBefore - expectedNet
      );
    });

    it("should send the 2% fee to the owner's wallet", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);

      // Give alice some tokens (fee goes back to owner during this transfer too)
      await token.connect(owner).transfer(alice.address, toWei("10000"));

      const ownerBalBefore = await token.balanceOf(owner.address);
      const transferAmount = toWei("1000");
      const expectedFee = toWei("20"); // 2%

      // Transfer from alice (non-owner) to bob → fee goes to owner
      await token.connect(alice).transfer(bob.address, transferAmount);

      expect(await token.balanceOf(owner.address)).to.equal(ownerBalBefore + expectedFee);
    });

    it("should send the correct net amount to the recipient", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await token.connect(owner).transfer(alice.address, toWei("5000"));

      const bobBalBefore = await token.balanceOf(bob.address);
      const transferAmount = toWei("500");
      const expectedNet = toWei("490"); // 98%

      await token.connect(alice).transfer(bob.address, transferAmount);
      expect(await token.balanceOf(bob.address)).to.equal(bobBalBefore + expectedNet);
    });

    it("should apply fee on transferFrom as well", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await token.connect(owner).transfer(alice.address, toWei("2000"));

      const transferAmount = toWei("200");
      const expectedNet = toWei("196"); // 98%
      const expectedFee = toWei("4"); // 2%

      await token.connect(alice).approve(bob.address, transferAmount);

      const ownerBalBefore = await token.balanceOf(owner.address);
      await token.connect(bob).transferFrom(alice.address, bob.address, transferAmount);

      // bob receives net amount minus the fee (fee was deducted from alice → owner)
      expect(await token.balanceOf(bob.address)).to.equal(expectedNet);
      expect(await token.balanceOf(owner.address)).to.equal(ownerBalBefore + expectedFee);
    });

    it("should not apply a fee when the owner is the sender (fee loops back)", async function () {
      // When owner transfers, the fee is sent to owner → effectively no net fee loss for owner.
      const { token, owner, alice } = await loadFixture(deployFixture);
      const ownerBalBefore = await token.balanceOf(owner.address);
      const transferAmount = toWei("1000");
      const expectedNet = toWei("980");
      const expectedFee = toWei("20");

      await token.connect(owner).transfer(alice.address, transferAmount);

      // Owner's balance = before - net (fee returns to owner)
      expect(await token.balanceOf(owner.address)).to.equal(ownerBalBefore - expectedNet);
      expect(await token.balanceOf(alice.address)).to.equal(expectedNet);
    });

    it("should not apply a fee on mints (from == address(0))", async function () {
      const { token, owner, bridge } = await loadFixture(deployFixture);
      // Burn some tokens first to make room under the cap
      const burnAmount = toWei("1000");
      await token.connect(bridge).crosschainBurn(owner.address, burnAmount);

      const mintAmount = toWei("500");
      const totalBefore = await token.totalSupply();
      const ownerBalBefore = await token.balanceOf(owner.address);

      await token.connect(owner).mint(owner.address, mintAmount);

      // totalSupply increases by exactly mintAmount (no fee on mint)
      expect(await token.totalSupply()).to.equal(totalBefore + mintAmount);
      // owner balance increases by exactly mintAmount (no fee deducted)
      expect(await token.balanceOf(owner.address)).to.equal(ownerBalBefore + mintAmount);
    });

    it("should not apply a fee on burns (to == address(0))", async function () {
      const { token, owner, bridge } = await loadFixture(deployFixture);

      // Burn tokens from owner via the bridge (supply is at max, so burn first)
      const burnAmount = toWei("1000");
      const ownerBalBefore = await token.balanceOf(owner.address);
      const totalBefore = await token.totalSupply();

      await token.connect(bridge).crosschainBurn(owner.address, burnAmount);

      // totalSupply decreases by exactly burnAmount (no fee on burn)
      expect(await token.totalSupply()).to.equal(totalBefore - burnAmount);
      // owner balance decreases by exactly burnAmount (no fee charged)
      expect(await token.balanceOf(owner.address)).to.equal(ownerBalBefore - burnAmount);
    });
  });

  // ── 3. Hard Supply Cap ─────────────────────────────────────────────────────
  describe("Hard Supply Cap (MAX_SUPPLY)", function () {
    it("should revert owner mint that would exceed MAX_SUPPLY", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      // totalSupply is already at MAX_SUPPLY
      await expect(
        token.connect(owner).mint(owner.address, 1n)
      ).to.be.revertedWithCustomError(token, "MaxSupplyExceeded");
    });

    it("should revert crosschainMint that would exceed MAX_SUPPLY", async function () {
      const { token, bridge } = await loadFixture(deployFixture);
      await expect(
        token.connect(bridge).crosschainMint(bridge.address, 1n)
      ).to.be.revertedWithCustomError(token, "MaxSupplyExceeded");
    });

    it("should allow mint exactly up to MAX_SUPPLY", async function () {
      // Deploy with 0 initial supply then mint the full cap
      const SuperChainerC20Token = await ethers.getContractFactory("SuperChainerC20Token");
      const [owner, bridge] = await ethers.getSigners();
      const token = await SuperChainerC20Token.deploy("T", "T", 0, bridge.address);

      await token.connect(owner).mint(owner.address, MAX_SUPPLY);
      expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
    });
  });

  // ── 4. Cross-Chain Functions (ISuperchainERC20 / ERC-7802) ─────────────────
  describe("crosschainMint & crosschainBurn", function () {
    it("should allow bridge to mint tokens to any address", async function () {
      const { token, owner, bridge, alice } = await loadFixture(deployFixture);
      // Burn some first to free up cap space
      await token.connect(bridge).crosschainBurn(owner.address, toWei("1000"));

      const mintAmount = toWei("500");
      const aliceBalBefore = await token.balanceOf(alice.address);

      await token.connect(bridge).crosschainMint(alice.address, mintAmount);
      expect(await token.balanceOf(alice.address)).to.equal(aliceBalBefore + mintAmount);
    });

    it("should emit CrosschainMint event", async function () {
      const { token, owner, bridge, alice } = await loadFixture(deployFixture);
      await token.connect(bridge).crosschainBurn(owner.address, toWei("1000"));
      const mintAmount = toWei("500");

      await expect(token.connect(bridge).crosschainMint(alice.address, mintAmount))
        .to.emit(token, "CrosschainMint")
        .withArgs(alice.address, mintAmount, bridge.address);
    });

    it("should allow bridge to burn tokens from any address", async function () {
      const { token, owner, bridge } = await loadFixture(deployFixture);
      const burnAmount = toWei("1000");
      const ownerBalBefore = await token.balanceOf(owner.address);

      await token.connect(bridge).crosschainBurn(owner.address, burnAmount);
      expect(await token.balanceOf(owner.address)).to.equal(ownerBalBefore - burnAmount);
    });

    it("should emit CrosschainBurn event", async function () {
      const { token, owner, bridge } = await loadFixture(deployFixture);
      const burnAmount = toWei("1000");

      await expect(token.connect(bridge).crosschainBurn(owner.address, burnAmount))
        .to.emit(token, "CrosschainBurn")
        .withArgs(owner.address, burnAmount, bridge.address);
    });

    it("should revert crosschainMint if caller is not bridge", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(
        token.connect(alice).crosschainMint(alice.address, toWei("100"))
      ).to.be.revertedWithCustomError(token, "CallerNotSuperchainBridge");
    });

    it("should revert crosschainBurn if caller is not bridge", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(
        token.connect(alice).crosschainBurn(alice.address, toWei("100"))
      ).to.be.revertedWithCustomError(token, "CallerNotSuperchainBridge");
    });

    it("crosschainMint should not apply the 2% fee", async function () {
      const { token, owner, bridge, alice } = await loadFixture(deployFixture);
      await token.connect(bridge).crosschainBurn(owner.address, toWei("1000"));

      const mintAmount = toWei("500");
      const aliceBalBefore = await token.balanceOf(alice.address);

      await token.connect(bridge).crosschainMint(alice.address, mintAmount);
      // alice receives exactly mintAmount (no fee deducted)
      expect(await token.balanceOf(alice.address)).to.equal(aliceBalBefore + mintAmount);
    });
  });

  // ── 5. Owner-only admin functions ──────────────────────────────────────────
  describe("Owner admin functions", function () {
    describe("mint()", function () {
      it("should allow owner to mint tokens", async function () {
        const { token, owner, bridge, alice } = await loadFixture(deployFixture);
        // Free up cap space first
        await token.connect(bridge).crosschainBurn(owner.address, toWei("1000"));

        const mintAmount = toWei("500");
        await token.connect(owner).mint(alice.address, mintAmount);
        expect(await token.balanceOf(alice.address)).to.equal(mintAmount);
      });

      it("should revert if non-owner calls mint()", async function () {
        const { token, alice } = await loadFixture(deployFixture);
        await expect(
          token.connect(alice).mint(alice.address, toWei("100"))
        ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
      });
    });

    describe("setSuperchainBridge()", function () {
      it("should allow owner to update the bridge address", async function () {
        const { token, owner, alice } = await loadFixture(deployFixture);
        await token.connect(owner).setSuperchainBridge(alice.address);
        expect(await token.superchainBridge()).to.equal(alice.address);
      });

      it("should emit SuperchainBridgeUpdated event", async function () {
        const { token, owner, bridge, alice } = await loadFixture(deployFixture);
        await expect(token.connect(owner).setSuperchainBridge(alice.address))
          .to.emit(token, "SuperchainBridgeUpdated")
          .withArgs(bridge.address, alice.address);
      });

      it("should revert when setting bridge to zero address", async function () {
        const { token, owner } = await loadFixture(deployFixture);
        await expect(
          token.connect(owner).setSuperchainBridge(ethers.ZeroAddress)
        ).to.be.revertedWith("Bridge address cannot be zero");
      });

      it("should revert if non-owner calls setSuperchainBridge()", async function () {
        const { token, alice } = await loadFixture(deployFixture);
        await expect(
          token.connect(alice).setSuperchainBridge(alice.address)
        ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
      });

      it("should grant minting rights to the new bridge after update", async function () {
        const { token, owner, bridge, alice, bob } = await loadFixture(deployFixture);
        // Update bridge to alice
        await token.connect(owner).setSuperchainBridge(alice.address);

        // Old bridge can no longer call crosschainMint
        await expect(
          token.connect(bridge).crosschainMint(bob.address, toWei("1"))
        ).to.be.revertedWithCustomError(token, "CallerNotSuperchainBridge");

        // New bridge can call crosschainMint (free up cap space first)
        await token.connect(alice).crosschainBurn(owner.address, toWei("100"));
        await token.connect(alice).crosschainMint(bob.address, toWei("50"));
        expect(await token.balanceOf(bob.address)).to.equal(toWei("50"));
      });
    });
  });

  // ── 6. ERC-165 supportsInterface ───────────────────────────────────────────
  describe("supportsInterface (ERC-165)", function () {
    it("should return true for ERC-165 interface ID (0x01ffc9a7)", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.supportsInterface("0x01ffc9a7")).to.be.true;
    });

    it("should return false for a random interface ID", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.supportsInterface("0xdeadbeef")).to.be.false;
    });
  });

  // ── 7. Standard ERC-20 behaviour ───────────────────────────────────────────
  describe("ERC-20 standard behaviour", function () {
    it("should correctly handle allowance and transferFrom", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await token.connect(owner).transfer(alice.address, toWei("1000"));

      await token.connect(alice).approve(bob.address, toWei("500"));
      expect(await token.allowance(alice.address, bob.address)).to.equal(toWei("500"));

      await token.connect(bob).transferFrom(alice.address, bob.address, toWei("500"));
      // bob receives 98% (2% fee goes to owner)
      expect(await token.balanceOf(bob.address)).to.equal(toWei("490"));
    });

    it("should revert transfer when sender has insufficient balance", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      await expect(
        token.connect(alice).transfer(bob.address, toWei("1"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("should revert transferFrom when allowance is insufficient", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await token.connect(owner).transfer(alice.address, toWei("1000"));
      await token.connect(alice).approve(bob.address, toWei("10"));

      await expect(
        token.connect(bob).transferFrom(alice.address, bob.address, toWei("100"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });
  });
});
