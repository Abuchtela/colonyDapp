import { Resolvers } from '@apollo/client';
import { AddressZero } from 'ethers/constants';
import {
  ClientType,
  ColonyVersion,
  getExtensionHash,
  getEvents,
  getLogs,
  getBlockTime,
  ROOT_DOMAIN_ID,
} from '@colony/colony-js';

import { Context } from '~context/index';

import extensionData from '~data/staticData/extensionData';

export const extensionResolvers = ({
  colonyManager: { networkClient },
  colonyManager,
}: Required<Context>): Resolvers => ({
  Query: {
    async networkExtensionVersion(_, { extensionId }) {
      /*
       * Prettier is being stupid again
       */
      // eslint-disable-next-line max-len
      const extensionAddedToNetworkFilter = networkClient.filters.ExtensionAddedToNetwork(
        getExtensionHash(extensionId),
        null,
      );
      const extensionAddedEvents = await getEvents(
        networkClient,
        extensionAddedToNetworkFilter,
      );
      if (extensionAddedEvents.length) {
        const latestEvent = extensionAddedEvents
          .sort(
            (
              { values: { version: firstVersion } },
              { values: { version: secondVersion } },
            ) => firstVersion.toNumber() - secondVersion.toNumber(),
          )
          .pop();
        const version = latestEvent?.values?.version;
        return version.toNumber();
      }
      return 0;
    },
    async votingExtensionParams(_, { colonyAddress }) {
      try {
        const extensionClient = await colonyManager.getClient(
          ClientType.VotingReputationClient,
          colonyAddress,
        );

        const stakePeriodBigNum = await extensionClient.getStakePeriod();
        const stakePeriod = stakePeriodBigNum.toNumber();

        const submitPeriodBigNum = await extensionClient.getSubmitPeriod();
        const submitPeriod = submitPeriodBigNum.toNumber();

        const revealPeriodBigNum = await extensionClient.getRevealPeriod();
        const revealPeriod = revealPeriodBigNum.toNumber();

        const escalationPerBigNum = await extensionClient.getEscalationPeriod();
        const escalationPeriod = escalationPerBigNum.toNumber();

        return {
          __typename: 'VotingExtensionParams',
          stakePeriod,
          submitPeriod,
          revealPeriod,
          escalationPeriod,
        };
      } catch (error) {
        return error;
      }
    },
    async blockTime(_, { blockHash }) {
      try {
        const blocktime = await getBlockTime(
          networkClient.provider,
          blockHash === undefined ? 'latest' : blockHash,
        );
        return blocktime;
      } catch (error) {
        return error;
      }
    },
  },
  ColonyExtension: {
    async details({ address, extensionId }, { colonyAddress }) {
      const extension = extensionData[extensionId];
      const colonyClient = await colonyManager.getClient(
        ClientType.ColonyClient,
        colonyAddress,
      );
      if (colonyClient.clientVersion === ColonyVersion.GoerliGlider) {
        throw new Error('Colony version too old');
      }

      const { neededColonyPermissions } = extension;

      const missingPermissions = await Promise.resolve(
        neededColonyPermissions.reduce(async (roles, role) => {
          const hasRole = await colonyClient.hasUserRole(
            address,
            ROOT_DOMAIN_ID,
            role,
          );
          if (!hasRole) return [...(await roles), role];
          return roles;
        }, Promise.resolve([])),
      );

      const installFilter = networkClient.filters.ExtensionInstalled(
        getExtensionHash(extensionId),
        colonyAddress,
        null,
      );
      const installLogs = await getLogs(networkClient, installFilter);
      let installedBy = AddressZero;
      let installedAt = 0;

      if (
        installLogs[0] &&
        installLogs[0].transactionHash &&
        installLogs[0].blockHash
      ) {
        const { blockHash, transactionHash } = installLogs[0];
        const receipt = await networkClient.provider.getTransactionReceipt(
          transactionHash,
        );
        installedBy = receipt.from || AddressZero;
        const time = await getBlockTime(networkClient.provider, blockHash);
        installedAt = time || 0;
      }

      const extensionClient = await colonyClient.getExtensionClient(
        extensionId,
      );

      const deprecated = await extensionClient.getDeprecated();

      const version = await extensionClient.version();

      // If no initializationParams are present it does not need initialization
      // and will set to be true by default
      let initialized = !extension.initializationParams;
      if (!initialized) {
        // Otherwise we look for the presence of an initialization event
        // eslint-disable-next-line max-len
        const initializedFilter = extensionClient.filters.ExtensionInitialised();
        const initializedEvents = await getEvents(
          extensionClient,
          initializedFilter,
        );
        initialized = !!initializedEvents.length;
      }

      return {
        __typename: 'ColonyExtensionDetails',
        deprecated,
        missingPermissions,
        initialized,
        installedBy,
        installedAt,
        version: version.toNumber(),
      };
    },
  },
});
