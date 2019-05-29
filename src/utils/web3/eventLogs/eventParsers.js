/* @flow */

import type {
  ColonyClient as ColonyClientType,
  TokenClient as TokenClientType,
} from '@colony/colony-js-client';

import BigNumber from 'bn.js';

import type { ContractTransactionType } from '~immutable';
import type { Address } from '~types';

import { getLogDate } from './blocks';
import { createAddress } from '~types';

const createContractTxObj = ({
  colonyAddress,
  from,
  to,
  token,
  ...rest
}: Object): ContractTransactionType => ({
  ...rest,
  ...(colonyAddress ? { colonyAddress: createAddress(colonyAddress) } : {}),
  ...(from ? { from: createAddress(from) } : {}),
  ...(to ? { to: createAddress(to) } : {}),
  token: createAddress(token),
});

/*
 * Given a ColonyJS-parsed ColonyFundsClaimedEvent, log from which it was
 * parsed, ColonyClient and colonyAddress, return a ContractTransactionType
 * object, or null if the claim amount was zero.
 */
export const parseColonyFundsClaimedEvent = async ({
  colonyClient: {
    adapter: { provider },
  },
  colonyClient,
  colonyAddress,
  event: { payoutRemainder: amount, token },
  log: { transactionHash },
  log,
}: {
  colonyClient: ColonyClientType,
  colonyAddress: Address,
  event: Object,
  log: Object,
}): Promise<?ContractTransactionType> => {
  const date = await getLogDate(colonyClient.adapter.provider, log);
  const { from } = await provider.getTransaction(transactionHash);

  // don't show claims of zero
  return amount.gt(new BigNumber(0))
    ? createContractTxObj({
        amount,
        colonyAddress,
        date,
        from,
        hash: transactionHash,
        incoming: true,
        token,
      })
    : null;
};

/*
 * Given a ColonyJS-parsed ColonyFundsMovedBetweenFundingPotsEvent, log from
 * which it was parsed, ColonyClient and colonyAddress, return a
 * ContractTransactionType object.
 */
export const parseColonyFundsMovedBetweenFundingPotsEvent = async ({
  colonyClient,
  colonyAddress,
  event: { amount, fromPot, token },
  log: { transactionHash },
  log,
}: {
  colonyClient: ColonyClientType,
  colonyAddress: Address,
  event: Object,
  log: Object,
}): Promise<ContractTransactionType> => {
  const date = await getLogDate(colonyClient.adapter.provider, log);

  /**
   * @todo Replace the placeholder taskId once able to get taskId from potId (funds event handler).
   */
  const taskId = 1;
  // const [, taskId] = yield call(
  //   [colonyClient.contract, colonyClient.contract.pots],
  //   events[i].fromPot === 1 ? events[i].toPot : events[i].fromPot,
  // );

  return createContractTxObj({
    amount,
    colonyAddress,
    date,
    incoming: fromPot !== 1,
    taskId,
    token,
    hash: transactionHash,
  });
};

/*
 * Given a ColonyJS-parsed PayoutClaimedEvent, log from which it was
 * parsed, and ColonyClient, return a ContractTransactionType object.
 */
export const parsePayoutClaimedEvent = async ({
  event: { taskId, role, amount, token },
  log: { transactionHash: hash },
  log,
  colonyClient,
}: {
  colonyClient: ColonyClientType,
  event: Object,
  log: Object,
}): Promise<ContractTransactionType> => {
  const date = await getLogDate(colonyClient.adapter.provider, log);

  const { address: to } = await colonyClient.getTaskRole.call({ taskId, role });
  return createContractTxObj({
    amount,
    date,
    hash,
    incoming: false,
    taskId,
    to,
    token,
  });
};

/*
 * Given a ColonyJS-parsed TransferEvent, log from which it was parsed, Array
 * of Colony token claim events and associated logs from which they were
 * passed, ColonyClient, and colonyAddress, return a ContractTransactionType
 * object or null if that token has been claimed since the Transfer.
 */
export const parseUnclaimedTransferEvent = async ({
  claimEvents,
  claimLogs,
  colonyClient,
  colonyAddress,
  transferEvent: { from, value: amount },
  transferLog: { address, blockNumber, transactionHash: hash },
  transferLog,
}: {
  claimEvents: Array<Object>,
  claimLogs: Array<Object>,
  colonyClient: ColonyClientType,
  colonyAddress: Address,
  transferEvent: Object,
  transferLog: Object,
}): Promise<?ContractTransactionType> => {
  const date = await getLogDate(colonyClient.adapter.provider, transferLog);
  const token = createAddress(address);

  // Only return if we haven't claimed since it happened
  return claimEvents.find(
    (claimEvent, i) =>
      createAddress(claimEvent.token) === token &&
      claimLogs[i].blockNumber > blockNumber,
  )
    ? null
    : createContractTxObj({
        amount,
        colonyAddress,
        date,
        from,
        hash,
        incoming: true,
        token,
      });
};

/*
 * Given a ColonyJS-parsed TransferEvent for a user, the log from which it was
 * parsed, ColonyClient, and walletAddress, return a ContractTransactionType
 * object for the token transfer.
 */
export const parseUserTransferEvent = async ({
  event: { value: amount },
  event,
  log: { address: token, transactionHash: hash },
  log,
  tokenClient,
  userColonyAddresses,
  walletAddress,
}: {
  event: Object,
  log: Object,
  tokenClient: TokenClientType,
  userColonyAddresses: Address[],
  walletAddress: string,
}): Promise<ContractTransactionType> => {
  const date = await getLogDate(tokenClient.adapter.provider, log);
  const to = createAddress(event.to);
  const from = createAddress(event.from);

  const colonyAddress = userColonyAddresses.find(
    address => address === from || address === to,
  );

  return createContractTxObj({
    amount,
    colonyAddress,
    date,
    from,
    hash,
    incoming: to === walletAddress,
    to,
    token,
  });
};
