/* @flow */
/* eslint-disable class-methods-use-this */

import type { WalletObjectType } from '@colony/purser-core/flowtypes';
import type { IdentityProvider } from './types';

import Keystore from './Keystore';
import PurserIdentity from './PurserIdentity';

// TODO: Use actual type for common wallet interface
type PurserWallet = WalletObjectType;
type Options = {};
type ProviderType = 'ETHEREUM_ACCOUNT';

const PROVIDER_TYPE = 'ETHEREUM_ACCOUNT';

class PurserIdentityProvider<I: PurserIdentity> implements IdentityProvider<I> {
  _options: Options;

  _type: ProviderType;

  _purserWallet: PurserWallet;

  constructor(purserWallet: PurserWallet, options: Options = {}) {
    this._type = PROVIDER_TYPE;
    // TODO: Make sure wallet is unlocked when creating an identity
    this._purserWallet = purserWallet;
    this._options = options;
  }

  async createIdentity() {
    const walletAddress = this._purserWallet.address;
    if (!walletAddress) {
      throw new Error('Could not get wallet address. Is it unlocked?');
    }
    // Always create a key per "session"
    const orbitKey = Keystore.createKey();

    // Sign the id with the signing key we're going to use
    const idSignature = Keystore.sign(orbitKey, walletAddress);

    // Get the hex string of the public key
    const publicKey = orbitKey.getPublic('hex');

    // Sign both the key and the signature created with that key
    const pubKeyIdSignature = await this._purserWallet.signMessage({
      message: publicKey + idSignature,
    });

    return new PurserIdentity(
      walletAddress,
      publicKey,
      idSignature,
      pubKeyIdSignature,
      this._type,
      this,
      orbitKey,
    );
  }

  async sign(identity: PurserIdentity, data: any): Promise<string> {
    const signingKey = identity.orbitKey;
    if (!signingKey)
      throw new Error(`Private signing key not found from Keystore`);

    return Keystore.sign(signingKey, data);
  }

  async verify(
    signature: string,
    publicKey: string,
    data: any,
  ): Promise<boolean> {
    return Keystore.verify(signature, publicKey, data);
  }
}

export default PurserIdentityProvider;
