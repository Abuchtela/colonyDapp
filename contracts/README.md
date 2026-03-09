# SuperChainerC20Token

A cross-chain ERC-20 token implementing the **ERC-7802** (`ISuperchainERC20`) interface
for compatibility with Optimism's SuperChain infrastructure.  The contract is designed to
be deployed on **Gnosis Chain** (formerly xDai, chain ID 100).

> **Note on cross-chain compatibility**: The `crosschainMint` / `crosschainBurn` functions
> follow the ERC-7802 standard used by Optimism OP-Stack chains.  Gnosis Chain uses its
> own consensus mechanism and does not include the Optimism `SuperchainTokenBridge`
> predeploy at `0x4200…0028` by default.  If you deploy on a chain that does **not** have
> the predeploy, set `SUPERCHAIN_BRIDGE` to any controlled address (e.g., a multisig) so
> that the bridge-gated functions remain accessible.  On a full OP-Stack chain the
> canonical predeploy address is used and cross-chain transfers work natively.

---

## Token Features

| Property | Value |
|---|---|
| Standard | ERC-20 + ERC-7802 (SuperChainERC20) |
| Total Supply Cap | 100,000,000 SCC20 |
| Initial Token Value | $1 USD (100 USD cents) |
| Transaction Fee | 2% per transfer → owner's wallet |
| Cross-chain | Optimism SuperchainTokenBridge |
| Deployment Target | Gnosis Chain (formerly xDai, chain ID 100) |

---

## Architecture

```
SuperChainerC20Token
  ├─ ERC20 (OpenZeppelin v5)          – standard token functionality
  ├─ Ownable (OpenZeppelin v5)        – admin controls
  └─ ISuperchainERC20 (ERC-7802)      – cross-chain bridge interface
       ├─ crosschainMint(to, amount)  – called by SuperchainTokenBridge
       └─ crosschainBurn(from, amount)
```

### 2% Transaction Fee

Every regular token transfer deducts a **2% fee** from the transferred amount.  
The full fee is forwarded directly to the **owner's wallet**.

```
Alice sends 1000 SCC20 to Bob
  → Bob receives  980 SCC20  (98%)
  → Owner receives 20 SCC20  (2%)
```

Mints (`crosschainMint`, `mint`) and burns (`crosschainBurn`) are **fee-free**.

### Initial Token Value

`INITIAL_TOKEN_VALUE_USD_CENTS = 100` ($1.00) is stored on-chain as a reference constant.  
Future price-oracle integrations can compare the live token price against this value to
detect deviations from peg and trigger on-chain responses.

### Cross-Chain Bridging

The contract implements the `ISuperchainERC20` interface (ERC-7802), making it compatible
with the Optimism **SuperchainTokenBridge** predeploy
(`0x4200000000000000000000000000000000000028`).  
Only the registered bridge address may call `crosschainMint` / `crosschainBurn`.

---

## Prerequisites

- Node.js ≥ 18
- npm or yarn

---

## Setup

```bash
cd contracts
npm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env
```

---

## Compile

```bash
npm run compile
```

---

## Test

```bash
npm test
```

Run with gas reporting:

```bash
REPORT_GAS=1 npm test
```

Run with coverage:

```bash
npm run test:coverage
```

---

## Deploy

### xDai / Gnosis Chain

```bash
# Terminal 1 – start a local Hardhat node
npm run node

# Terminal 2 – deploy
npm run deploy:local
```

### Gnosis Chain

1. Add your deployer private key and (optionally) a dedicated RPC URL to `.env`:

```env
DEPLOYER_PRIVATE_KEY=0x<your-private-key>
XDAI_RPC_URL=https://rpc.gnosischain.com   # optional, this is the default
```

2. Run the deployment:

```bash
npm run deploy:xdai
```

3. Verify the contract on Gnosis Chain Blockscout:

```bash
npx hardhat verify --network xdai <DEPLOYED_ADDRESS> \
  "SuperChainerC20 Token" "SCC20" \
  "100000000000000000000000000" \           # 100 M * 1e18
  "0x4200000000000000000000000000000000000028"
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DEPLOYER_PRIVATE_KEY` | Hardhat account #0 | Private key of the deploying wallet |
| `XDAI_RPC_URL` | `https://rpc.gnosischain.com` | xDai / Gnosis Chain RPC endpoint |
| `TOKEN_NAME` | `SuperChainerC20 Token` | ERC-20 token name |
| `TOKEN_SYMBOL` | `SCC20` | ERC-20 token symbol |
| `INITIAL_SUPPLY` | `100000000` | Tokens minted to deployer at launch |
| `SUPERCHAIN_BRIDGE` | `0x4200…0028` | Authorised bridge predeploy address |
| `REPORT_GAS` | _(unset)_ | Set to any value to enable gas reports |

---

## Contract Interface (ABI Summary)

### State-changing functions

| Function | Access | Description |
|---|---|---|
| `transfer(to, amount)` | Public | ERC-20 transfer with 2% fee |
| `transferFrom(from, to, amount)` | Public | ERC-20 transferFrom with 2% fee |
| `approve(spender, amount)` | Public | ERC-20 approval |
| `mint(to, amount)` | Owner | Mint tokens (respects cap) |
| `setSuperchainBridge(newBridge)` | Owner | Update bridge address |
| `crosschainMint(to, amount)` | Bridge | Mint via SuperchainTokenBridge |
| `crosschainBurn(from, amount)` | Bridge | Burn via SuperchainTokenBridge |
| `renounceOwnership()` | Owner | Renounce admin rights |
| `transferOwnership(newOwner)` | Owner | Transfer admin rights |

### View functions

| Function | Returns | Description |
|---|---|---|
| `name()` | string | Token name |
| `symbol()` | string | Token symbol |
| `decimals()` | uint8 | Always 18 |
| `totalSupply()` | uint256 | Current total supply |
| `balanceOf(account)` | uint256 | Token balance |
| `allowance(owner, spender)` | uint256 | Remaining allowance |
| `owner()` | address | Current owner / fee recipient |
| `superchainBridge()` | address | Authorised bridge address |
| `MAX_SUPPLY()` | uint256 | Hard cap (100 M × 10¹⁸) |
| `INITIAL_TOKEN_VALUE_USD_CENTS()` | uint256 | Launch price constant (100 = $1) |
| `FEE_NUMERATOR()` | uint256 | Fee numerator (2) |
| `FEE_DENOMINATOR()` | uint256 | Fee denominator (100) |
| `supportsInterface(id)` | bool | ERC-165 interface detection |

---

## Security Considerations

- `crosschainMint` / `crosschainBurn` are gated by `onlySuperchainBridge`.
- `mint` is gated by `onlyOwner`.
- The hard supply cap is enforced in both `mint` and `crosschainMint`.
- The 2% fee bypasses mints and burns (from/to zero address) to avoid double-charging
  cross-chain operations.
- Integer division truncates fractional wei – any remainder stays with the sender.

---

## Interoperability with Optimism

The contract complies with **ERC-7802** which is the cross-chain token standard used by
Optimism's `SuperchainTokenBridge`.  When deployed on multiple OP-Stack chains, the bridge
can atomically burn tokens on the source chain and mint them on the destination chain
without altering global supply.

Gnosis Chain (chain ID 100) uses its own consensus mechanism and is not an OP-Stack chain.
To use the cross-chain features on Gnosis Chain, configure a trusted bridge address via
the `SUPERCHAIN_BRIDGE` environment variable at deploy time (or call `setSuperchainBridge`
post-deploy). The contract itself is fully ERC-7802 compliant and will work natively on
any OP-Stack chain that includes the `SuperchainTokenBridge` predeploy.
