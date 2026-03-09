// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title IERC7802
/// @notice Minimal interface for cross-chain ERC20 token operations as defined
///         by ERC-7802 and used by the Optimism SuperchainTokenBridge.
interface IERC7802 {
    /// @notice Emitted when tokens are minted on this chain via a cross-chain bridge call.
    event CrosschainMint(address indexed to, uint256 amount, address indexed sender);

    /// @notice Emitted when tokens are burned on this chain via a cross-chain bridge call.
    event CrosschainBurn(address indexed from, uint256 amount, address indexed sender);

    /// @notice Mints `_amount` tokens to `_to`. Only callable by the SuperchainTokenBridge.
    function crosschainMint(address _to, uint256 _amount) external;

    /// @notice Burns `_amount` tokens from `_from`. Only callable by the SuperchainTokenBridge.
    function crosschainBurn(address _from, uint256 _amount) external;
}

/// @title ISuperchainERC20
/// @notice Interface for a SuperchainERC20 token that is both an ERC-20 and supports
///         cross-chain bridging via the Optimism Superchain infrastructure.
interface ISuperchainERC20 is IERC7802 {
    // Inherits crosschainMint, crosschainBurn, and associated events from IERC7802.
}
