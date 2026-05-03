// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ISuperchainERC20.sol";

/// @title SuperChainerC20Token
/// @notice ERC-20 token compatible with Optimism's SuperChain cross-chain infrastructure.
///
///  Key properties:
///   - Total supply hard-capped at 100,000,000 tokens (18 decimals).
///   - A 2% fee is deducted on every transfer; the full fee amount is forwarded to
///     the contract owner's wallet.
///   - `crosschainMint` / `crosschainBurn` enable the Optimism SuperchainTokenBridge
///     to move tokens across chains without changing the global supply.
///   - The `initialTokenValueUSD` constant records the intended launch price ($1).
///     Future integrations with a price oracle should reference this value to
///     determine deviation from peg.
///
///  Deployment target: xDai (Gnosis Chain), chain ID 100.
contract SuperChainerC20Token is ERC20, Ownable, ISuperchainERC20 {
    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    /// @notice Hard cap on the total token supply (100 million tokens).
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;

    /// @notice Intended launch price in USD cents (100 = $1.00).
    ///         A future price-oracle integration can compare the live price against
    ///         this value to detect deviations.
    uint256 public constant INITIAL_TOKEN_VALUE_USD_CENTS = 100;

    /// @notice Numerator of the transfer-fee fraction (2 out of 100 → 2%).
    uint256 public constant FEE_NUMERATOR = 2;

    /// @notice Denominator of the transfer-fee fraction.
    uint256 public constant FEE_DENOMINATOR = 100;

    // -------------------------------------------------------------------------
    // Authorised bridge address
    // -------------------------------------------------------------------------

    /// @notice Address of the Optimism SuperchainTokenBridge that is allowed to
    ///         call `crosschainMint` and `crosschainBurn`.
    ///         On mainnet / production chains this is the canonical predeploy at
    ///         0x4200000000000000000000000000000000000028.
    address public superchainBridge;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when the authorised bridge address is updated.
    event SuperchainBridgeUpdated(address indexed oldBridge, address indexed newBridge);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    /// @notice Thrown when a caller that is not the SuperchainTokenBridge attempts
    ///         to invoke a bridge-only function.
    error CallerNotSuperchainBridge();

    /// @notice Thrown when minting would exceed the hard supply cap.
    error MaxSupplyExceeded();

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    /// @param _name           ERC-20 token name.
    /// @param _symbol         ERC-20 token symbol.
    /// @param _initialSupply  Tokens to mint immediately to the deployer (≤ MAX_SUPPLY).
    /// @param _superchainBridge Address of the SuperchainTokenBridge predeploy.
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _superchainBridge
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        require(_initialSupply <= MAX_SUPPLY, "Initial supply exceeds max supply");
        require(_superchainBridge != address(0), "Bridge address cannot be zero");

        superchainBridge = _superchainBridge;

        if (_initialSupply > 0) {
            _mint(msg.sender, _initialSupply);
        }
    }

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlySuperchainBridge() {
        if (msg.sender != superchainBridge) revert CallerNotSuperchainBridge();
        _;
    }

    // -------------------------------------------------------------------------
    // ISuperchainERC20 (ERC-7802) implementation
    // -------------------------------------------------------------------------

    /// @inheritdoc IERC7802
    /// @dev Can only be called by the authorised SuperchainTokenBridge.
    ///      Respects the hard supply cap.
    function crosschainMint(address _to, uint256 _amount) external override onlySuperchainBridge {
        if (totalSupply() + _amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(_to, _amount);
        emit CrosschainMint(_to, _amount, msg.sender);
    }

    /// @inheritdoc IERC7802
    /// @dev Can only be called by the authorised SuperchainTokenBridge.
    function crosschainBurn(address _from, uint256 _amount) external override onlySuperchainBridge {
        _burn(_from, _amount);
        emit CrosschainBurn(_from, _amount, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Owner-only administration
    // -------------------------------------------------------------------------

    /// @notice Mint new tokens to `_to`, subject to the hard supply cap.
    ///         Only callable by the contract owner.
    function mint(address _to, uint256 _amount) external onlyOwner {
        if (totalSupply() + _amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(_to, _amount);
    }

    /// @notice Update the authorised SuperchainTokenBridge address.
    ///         Only callable by the contract owner.
    function setSuperchainBridge(address _newBridge) external onlyOwner {
        require(_newBridge != address(0), "Bridge address cannot be zero");
        emit SuperchainBridgeUpdated(superchainBridge, _newBridge);
        superchainBridge = _newBridge;
    }

    // -------------------------------------------------------------------------
    // ERC-20 override – 2% fee on every transfer
    // -------------------------------------------------------------------------

    /// @dev Intercepts every token transfer to collect the 2% protocol fee.
    ///      The fee is forwarded directly to the contract owner's wallet.
    ///      Cross-chain mint/burn calls bypass this hook through `_mint`/`_burn`,
    ///      which do not invoke the overridden `_update`.
    ///
    ///      Fee calculation uses integer arithmetic; any remainder (≤ 1 wei per
    ///      transfer) stays with the sender.
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        // Mints (from == address(0)) and burns (to == address(0)) are fee-free.
        if (from == address(0) || to == address(0)) {
            super._update(from, to, amount);
            return;
        }

        uint256 fee = (amount * FEE_NUMERATOR) / FEE_DENOMINATOR;
        uint256 netAmount = amount - fee;

        // Transfer net amount to recipient.
        super._update(from, to, netAmount);

        // Transfer fee to owner.
        if (fee > 0) {
            super._update(from, owner(), fee);
        }
    }

    // -------------------------------------------------------------------------
    // ERC-165 supportsInterface
    // -------------------------------------------------------------------------

    /// @notice Returns true for ERC-165, ERC-20, and the ISuperchainERC20 (ERC-7802) interface.
    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == type(ISuperchainERC20).interfaceId ||
            interfaceId == type(IERC7802).interfaceId ||
            interfaceId == 0x01ffc9a7; // ERC-165
    }
}
