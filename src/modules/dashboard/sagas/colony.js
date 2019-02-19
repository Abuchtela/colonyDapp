/* @flow */

import type { Saga } from 'redux-saga';

import {
  call,
  delay,
  fork,
  put,
  takeEvery,
  takeLatest,
} from 'redux-saga/effects';
import { replace } from 'connected-react-router';

import type { Action } from '~redux';
import type { ENSName } from '~types';

import { callCaller, putError, takeFrom } from '~utils/saga/effects';
import { getHashedENSDomainString } from '~utils/web3/ens';
import { CONTEXT, getContext } from '~context';
import { ACTIONS } from '~redux';

import { NETWORK_CONTEXT } from '../../../lib/ColonyManager/constants';

import { getNetworkMethod } from '../../core/sagas/utils';
import { set, getAll } from '../../../lib/database/commands';

import {
  transactionAddParams,
  transactionAddIdentifier,
  transactionReady,
} from '../../core/actionCreators';

import { createTransaction, getTxChannel } from '../../core/sagas';
import { COLONY_CONTEXT } from '../../core/constants';

import { colonyStoreBlueprint } from '../stores';

import { fetchColonyStore, getOrCreateDomainsIndexStore } from './shared';

function* getOrCreateColonyStore(colonyENSName: ENSName) {
  /*
   * Get and load the store, if it exists.
   */
  let store = yield call(fetchColonyStore, colonyENSName);
  if (store) yield call([store, store.load]);

  /*
   * Create the store if it doesn't already exist.
   */
  // TODO: No access controller available yet
  if (!store) {
    const ddb = yield* getContext(CONTEXT.DDB_INSTANCE);
    store = yield call([ddb, ddb.createStore], colonyStoreBlueprint);
  }

  return store;
}

// TODO: Rename, complete and wire up after new onboarding is in place
function* colonyCreateNew({
  meta,
  payload,
}: // $FlowFixMe (not an actual action)
Action<'COLONY_CREATE_NEW'>): Saga<void> {
  const key = 'transaction.batch.createColony';
  const createTokenId = `${meta.id}-createToken`;
  const createColonyId = `${meta.id}-createColony`;
  const createLabelId = `${meta.id}-createLabel`;
  const createTokenChannel = yield call(getTxChannel, createTokenId);
  const createColonyChannel = yield call(getTxChannel, createColonyId);
  const createLabelChannel = yield call(getTxChannel, createLabelId);

  try {
    const { tokenName, tokenSymbol, colonyName } = payload;

    yield fork(createTransaction, createTokenId, {
      context: NETWORK_CONTEXT,
      methodName: 'createToken',
      params: { name: tokenName, symbol: tokenSymbol },
      group: {
        key,
        id: meta.id,
        index: 0,
      },
    });

    yield fork(createTransaction, createColonyId, {
      context: NETWORK_CONTEXT,
      methodName: 'createColony',
      ready: false,
      group: {
        key,
        id: meta.id,
        index: 1,
      },
    });

    yield fork(createTransaction, createLabelId, {
      context: COLONY_CONTEXT,
      methodName: 'registerColonyLabel',
      params: { colonyName },
      ready: false,
      group: {
        key,
        id: meta.id,
        index: 2,
      },
    });

    yield takeFrom(createTokenChannel, ACTIONS.TRANSACTION_CREATED);
    yield takeFrom(createColonyChannel, ACTIONS.TRANSACTION_CREATED);
    yield takeFrom(createLabelChannel, ACTIONS.TRANSACTION_CREATED);

    const {
      payload: {
        transaction: { receipt },
      },
    } = yield takeFrom(createTokenChannel, ACTIONS.TRANSACTION_SUCCEEDED);

    yield put(
      transactionAddParams(createColonyId, {
        tokenAddress: receipt && receipt.contractAddress,
      }),
    );

    yield put(transactionReady(createColonyId));

    const {
      payload: {
        transaction: { eventData },
      },
    } = yield takeFrom(createColonyChannel, ACTIONS.TRANSACTION_SUCCEEDED);

    yield put(
      transactionAddParams(createLabelId, {
        // TODO: get orbit db path from somewhere
        orbitDBPath: 'temp',
      }),
    );

    yield put(
      transactionAddIdentifier(
        createLabelId,
        eventData && eventData.colonyAddress,
      ),
    );

    yield put(transactionReady(createLabelId));

    yield takeFrom(createLabelChannel, ACTIONS.TRANSACTION_SUCCEEDED);

    yield put({
      type: ACTIONS.COLONY_CREATE_SUCCESS,
      meta,
      payload: undefined,
    });
  } catch (error) {
    yield putError(ACTIONS.COLONY_CREATE_ERROR, error, meta);
  } finally {
    createTokenChannel.close();
    createColonyChannel.close();
    createLabelChannel.close();
  }
}

function* colonyCreate({
  payload: { tokenAddress },
  meta,
}: Action<typeof ACTIONS.COLONY_CREATE>): Saga<void> {
  const txChannel = yield call(getTxChannel, meta.id);

  try {
    yield fork(createTransaction, meta.id, {
      context: NETWORK_CONTEXT,
      methodName: 'createColony',
      params: { tokenAddress },
    });

    // TODO: These are just temporary for now until we have the new onboarding workflow
    // Normally these are done by the user
    yield put({
      type: ACTIONS.TRANSACTION_ESTIMATE_GAS,
      meta,
    });
    yield takeFrom(txChannel, ACTIONS.TRANSACTION_GAS_UPDATE);
    yield put({
      type: ACTIONS.TRANSACTION_SEND,
      meta,
    });
    // TODO temp end

    const { payload } = yield takeFrom(
      txChannel,
      ACTIONS.TRANSACTION_SUCCEEDED,
    );

    yield put({
      type: ACTIONS.COLONY_CREATE_SUCCESS,
      meta,
      payload,
    });
  } catch (error) {
    yield putError(ACTIONS.COLONY_CREATE_ERROR, error);
  } finally {
    txChannel.close();
  }
}

function* colonyCreateLabel({
  payload: {
    colonyId,
    colonyAddress,
    colonyName,
    ensName,
    tokenAddress,
    tokenName,
    tokenSymbol,
    tokenIcon,
  },
  meta,
}: Action<typeof ACTIONS.COLONY_CREATE_LABEL>): Saga<void> {
  const colonyStoreData = {
    address: colonyAddress,
    databases: {
      domainsIndex: undefined,
    },
    ensName,
    id: colonyId,
    name: colonyName,
    token: {
      address: tokenAddress,
      balance: undefined,
      icon: tokenIcon,
      name: tokenName,
      symbol: tokenSymbol,
    },
  };

  // Dispatch and action to set the current colony in the app state (simulating fetching it)
  const fetchSuccessAction = {
    type: ACTIONS.COLONY_FETCH_SUCCESS,
    meta: { keyPath: [ensName] },
    payload: colonyStoreData,
  };
  yield put<Action<typeof ACTIONS.COLONY_FETCH_SUCCESS>>(fetchSuccessAction);

  /*
   * Get and/or create the index stores for this colony.
   */
  const domainsIndex = yield call(getOrCreateDomainsIndexStore, ensName);
  const databases = {
    domainsIndex: domainsIndex.address.toString(),
  };

  /*
   * Get or create a colony store and save the colony to that store.
   */
  const store = yield call(getOrCreateColonyStore, ensName);

  /*
   * Update the colony in the app state with the `domainsIndex` address.
   */
  const completeColonyStoreData = {
    ...colonyStoreData,
    databases,
  };
  yield put<Action<typeof ACTIONS.COLONY_FETCH_SUCCESS>>({
    ...fetchSuccessAction,
    payload: completeColonyStoreData,
  });

  /*
   * Save the colony props to the colony store.
   */
  yield call(set, store, completeColonyStoreData);

  const txChannel = yield call(getTxChannel, meta.id);

  try {
    yield fork(createTransaction, meta.id, {
      context: COLONY_CONTEXT,
      methodName: 'registerColonyLabel',
      identifier: colonyAddress,
      params: {
        colonyName: ensName,
        orbitDBPath: store.address.toString(),
      },
    });

    // TODO: These are just temporary for now until we have the new onboarding workflow
    // Normally these are done by the user
    yield put({
      type: ACTIONS.TRANSACTION_ESTIMATE_GAS,
      meta,
    });
    yield takeFrom(txChannel, ACTIONS.TRANSACTION_GAS_UPDATE);
    yield put({
      type: ACTIONS.TRANSACTION_SEND,
      meta,
    });
    // TODO temp end

    const { payload } = yield takeFrom(
      txChannel,
      ACTIONS.TRANSACTION_SUCCEEDED,
    );

    yield put({
      type: ACTIONS.COLONY_CREATE_LABEL_SUCCESS,
      meta,
      payload,
    });

    yield put(replace(`colony/${ensName}`));
  } catch (error) {
    yield putError(ACTIONS.COLONY_CREATE_LABEL_ERROR, error);
  } finally {
    txChannel.close();
  }
}

function* colonyDomainValidate({
  payload: { ensName },
  meta,
}: Action<typeof ACTIONS.COLONY_DOMAIN_VALIDATE>): Saga<void> {
  yield delay(300);

  const nameHash = yield call(getHashedENSDomainString, ensName, 'colony');

  const getAddressForENSHash = yield call(
    getNetworkMethod,
    'getAddressForENSHash',
  );
  const { ensAddress } = yield call(
    [getAddressForENSHash, getAddressForENSHash.call],
    { nameHash },
  );

  if (ensAddress) {
    yield putError(
      ACTIONS.COLONY_DOMAIN_VALIDATE_ERROR,
      new Error('ENS address already exists'),
      meta,
    );
    return;
  }
  yield put<Action<typeof ACTIONS.COLONY_DOMAIN_VALIDATE_SUCCESS>>({
    type: ACTIONS.COLONY_DOMAIN_VALIDATE_SUCCESS,
    meta,
    payload: undefined,
  });
}

function* colonyProfileUpdate({
  meta: {
    keyPath: [ensName],
  },
  meta,
  payload: colonyUpdateValues,
}: Action<typeof ACTIONS.COLONY_PROFILE_UPDATE>): Saga<void> {
  try {
    /*
     * Get the colony store
     */
    const store = yield call(fetchColonyStore, ensName);

    /*
     * Set the new values in the store
     */
    yield call(set, store, colonyUpdateValues);

    /*
     * Update the colony in the redux store to show the updated values
     */
    yield put<Action<typeof ACTIONS.COLONY_PROFILE_UPDATE_SUCCESS>>({
      type: ACTIONS.COLONY_PROFILE_UPDATE_SUCCESS,
      meta,
      payload: colonyUpdateValues,
    });
  } catch (error) {
    yield putError(ACTIONS.COLONY_PROFILE_UPDATE_ERROR, error, meta);
  }
}

function* colonyFetch({
  meta: {
    keyPath: [ensName],
  },
  meta,
}: Action<typeof ACTIONS.COLONY_FETCH>): Saga<void> {
  try {
    // TODO error if the colony does not exist!
    const store = yield call(getOrCreateColonyStore, ensName);
    const payload = yield call(getAll, store);
    yield put<Action<typeof ACTIONS.COLONY_FETCH_SUCCESS>>({
      type: ACTIONS.COLONY_FETCH_SUCCESS,
      meta,
      payload,
    });
  } catch (error) {
    yield putError(ACTIONS.COLONY_FETCH_ERROR, error, meta);
  }
}

function* colonyENSNameFetch({
  meta: {
    keyPath: [colonyAddress],
  },
  meta,
}: Action<typeof ACTIONS.COLONY_ENS_NAME_FETCH>): Saga<void> {
  try {
    const { domain } = yield callCaller({
      context: NETWORK_CONTEXT,
      methodName: 'lookupRegisteredENSDomain',
      params: { ensAddress: colonyAddress },
    });
    if (!domain)
      throw new Error(
        `No Colony ENS name found for address "${colonyAddress}"`,
      );
    const [ensName, type] = domain.split('.');
    if (type !== 'colony')
      throw new Error(`Address "${colonyAddress}" is not a Colony`);

    yield put<Action<typeof ACTIONS.COLONY_ENS_NAME_FETCH_SUCCESS>>({
      type: ACTIONS.COLONY_ENS_NAME_FETCH_SUCCESS,
      meta,
      payload: ensName,
    });
  } catch (error) {
    yield putError(ACTIONS.COLONY_ENS_NAME_FETCH_ERROR, error, meta);
  }
}

function* colonyAvatarUpload({
  meta: {
    keyPath: [ensName],
  },
  meta,
  payload: { data },
}: Action<typeof ACTIONS.COLONY_AVATAR_UPLOAD>): Saga<void> {
  try {
    // first attempt upload to IPFS
    const ipfsNode = yield* getContext(CONTEXT.IPFS_NODE);
    const hash = yield call([ipfsNode, ipfsNode.addString], data);

    /*
     * Get the colony store
     */
    const store = yield call(fetchColonyStore, ensName);

    /*
     * Set the avatar's hash in the store
     */
    yield call(set, store, 'avatar', hash);

    /*
     * Store the new avatar hash value in the redux store so we can show it
     */
    yield put<Action<typeof ACTIONS.COLONY_AVATAR_UPLOAD_SUCCESS>>({
      type: ACTIONS.COLONY_AVATAR_UPLOAD_SUCCESS,
      meta,
      payload: hash,
    });
  } catch (error) {
    yield putError(ACTIONS.COLONY_AVATAR_UPLOAD_ERROR, error, meta);
  }
}

function* colonyAvatarFetch({
  meta,
  meta: {
    keyPath: [hash],
  },
}: Action<typeof ACTIONS.COLONY_AVATAR_FETCH>): Saga<void> {
  try {
    /*
     * Get the base64 avatar image from ipfs
     */
    const ipfsNode = yield* getContext(CONTEXT.IPFS_NODE);
    const avatarData = yield call([ipfsNode, ipfsNode.getString], hash);
    /*
     * Put the base64 value in the redux state so we can show it
     */
    yield put<Action<typeof ACTIONS.COLONY_AVATAR_FETCH_SUCCESS>>({
      type: ACTIONS.COLONY_AVATAR_FETCH_SUCCESS,
      meta,
      payload: { hash, avatarData },
    });
  } catch (error) {
    yield putError(ACTIONS.COLONY_AVATAR_FETCH_ERROR, error, meta);
  }
}

function* colonyAvatarRemove({
  meta,
  meta: {
    keyPath: [ensName],
  },
}: Action<typeof ACTIONS.COLONY_AVATAR_REMOVE>): Saga<void> {
  try {
    /*
     * Get the colony store
     */
    const store = yield call(fetchColonyStore, ensName);

    /*
     * Set avatar to undefined
     */
    yield call(set, store, 'avatar', undefined);

    /*
     * Also set the avatar in the state to undefined (via a reducer)
     */
    yield put<Action<typeof ACTIONS.COLONY_AVATAR_REMOVE_SUCCESS>>({
      type: ACTIONS.COLONY_AVATAR_REMOVE_SUCCESS,
      meta,
      payload: undefined,
    });
  } catch (error) {
    yield putError(ACTIONS.COLONY_AVATAR_REMOVE_ERROR, error, meta);
  }
}

export default function* colonySagas(): any {
  yield takeEvery(ACTIONS.COLONY_AVATAR_FETCH, colonyAvatarFetch);
  // TODO: rename properly once the new onboarding is done
  yield takeEvery('COLONY_CREATE_NEW', colonyCreateNew);
  yield takeEvery(ACTIONS.COLONY_CREATE, colonyCreate);
  yield takeEvery(ACTIONS.COLONY_CREATE_LABEL, colonyCreateLabel);
  yield takeEvery(ACTIONS.COLONY_ENS_NAME_FETCH, colonyENSNameFetch);
  yield takeEvery(ACTIONS.COLONY_FETCH, colonyFetch);
  yield takeEvery(ACTIONS.COLONY_PROFILE_UPDATE, colonyProfileUpdate);
  /*
   * Note that the following actions use `takeLatest` because they are
   * dispatched on user keyboard input and use the `delay` saga helper.
   */
  yield takeLatest(ACTIONS.COLONY_AVATAR_REMOVE, colonyAvatarRemove);
  yield takeLatest(ACTIONS.COLONY_AVATAR_UPLOAD, colonyAvatarUpload);
  yield takeLatest(ACTIONS.COLONY_DOMAIN_VALIDATE, colonyDomainValidate);
}
