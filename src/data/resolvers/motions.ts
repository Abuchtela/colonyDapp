import {
  ClientType,
  ExtensionClient,
  getLogs,
  getBlockTime,
  MotionState as NetworkMotionState,
  getEvents,
} from '@colony/colony-js';
import { bigNumberify } from 'ethers/utils';
import { Resolvers } from '@apollo/client';

import { Context } from '~context/index';
import { createAddress } from '~utils/web3';
import { getMotionActionType, getMotionState } from '~utils/events';
import { MotionVote } from '~utils/colonyMotions';
import { ColonyAndExtensionsEvents } from '~types/index';
import {
  UserReputationQuery,
  UserReputationQueryVariables,
  UserReputationDocument,
} from '~data/index';

import {
  ActionsPageFeedType,
  SystemMessage,
  SystemMessagesName,
} from '~dashboard/ActionsPageFeed';

import { ProcessedEvent } from './colonyActions';

const getMotionEvents = async (
  votingReputationClient: ExtensionClient,
  motionId: string,
) => {
  const motionStakedLogs = await getLogs(
    votingReputationClient,
    // @TODO Add missing types to colonyjs
    // @ts-ignore
    votingReputationClient.filters.MotionStaked(motionId, null, null, null),
  );

  const parsedMotionEvents = await Promise.all(
    [...motionStakedLogs].map(async (log) => {
      const parsedLog = votingReputationClient.interface.parseLog(log);
      const { address, blockHash, blockNumber, transactionHash } = log;
      const {
        name,
        values: { amount, ...rest },
      } = parsedLog;
      const stakeAmount =
        name === ColonyAndExtensionsEvents.MotionStaked ? amount : null;

      return {
        type: ActionsPageFeedType.NetworkEvent,
        name,
        values: {
          ...rest,
          stakeAmount,
        },
        createdAt: blockHash
          ? await getBlockTime(votingReputationClient.provider, blockHash)
          : 0,
        emmitedBy: ClientType.VotingReputationClient,
        address,
        blockNumber,
        transactionHash,
      } as ProcessedEvent;
    }),
  );

  const sortedMotionEvents = parsedMotionEvents.sort(
    (firstEvent, secondEvent) => firstEvent.createdAt - secondEvent.createdAt,
  );

  return sortedMotionEvents;
};

export const motionsResolvers = ({
  colonyManager: { networkClient },
  colonyManager,
  apolloClient,
}: Required<Context>): Resolvers => ({
  Query: {
    async motionsSystemMessages(_, { motionId, colonyAddress }) {
      const { provider } = networkClient;
      const votingReputationClient = (await colonyManager.getClient(
        ClientType.VotingReputationClient,
        colonyAddress,
      )) as ExtensionClient;
      const motion = await votingReputationClient.getMotion(motionId);
      const motionNetworkState = await votingReputationClient.getMotionState(
        motionId,
      );
      const systemMessages: SystemMessage[] = [];

      // @TODO Add missing types to colonyjs
      // @ts-ignore
      const motionStakedFilter = votingReputationClient.filters.MotionStaked(
        motionId,
        null,
        null,
        null,
      );
      const motionStakedLogs = await getLogs(
        votingReputationClient,
        motionStakedFilter,
      );
      // @ts-ignore
      // eslint-disable-next-line max-len
      const motionVoteSubmittedFilter = votingReputationClient.filters.MotionVoteSubmitted(
        motionId,
        null,
      );
      const motionVoteSubmittedLogs = await getLogs(
        votingReputationClient,
        motionVoteSubmittedFilter,
      );
      // @ts-ignore
      // eslint-disable-next-line max-len
      const motionVoteRevealedFilter = votingReputationClient.filters.MotionVoteRevealed(
        motionId,
        null,
        null,
      );
      const motionVoteRevealedLogs = await getLogs(
        votingReputationClient,
        motionVoteRevealedFilter,
      );

      const parsedEvents = await Promise.all(
        [
          ...motionStakedLogs,
          ...motionVoteRevealedLogs,
          ...motionVoteSubmittedLogs,
        ].map(async (log) => {
          const parsedLog = votingReputationClient.interface.parseLog(log);
          const { address, blockHash, blockNumber, transactionHash } = log;
          const { name, values } = parsedLog;
          return {
            type: ActionsPageFeedType.NetworkEvent,
            name,
            values,
            createdAt: blockHash ? await getBlockTime(provider, blockHash) : 0,
            emmitedBy: ClientType.ColonyClient,
            address,
            blockNumber,
            transactionHash,
          } as ProcessedEvent;
        }),
      );

      const sortedEvents = parsedEvents.sort(
        (firstEvent, secondEvent) =>
          secondEvent.createdAt - firstEvent.createdAt,
      );
      const blocktime = await getBlockTime(networkClient.provider, 'latest');

      const timeToSubmitMS = motion.events[1].toNumber() * 1000;
      const timeToSubmitInPast = timeToSubmitMS < blocktime;

      if (
        motionNetworkState === NetworkMotionState.Reveal ||
        timeToSubmitInPast
      ) {
        const newestVoteSubmittedEvent = sortedEvents.find(
          (event) =>
            event.name === ColonyAndExtensionsEvents.MotionVoteSubmitted,
        );
        if (newestVoteSubmittedEvent) {
          systemMessages.push({
            type: ActionsPageFeedType.SystemMessage,
            name: SystemMessagesName.MotionRevealPhase,
            createdAt: newestVoteSubmittedEvent.createdAt,
          });
        }
      }

      if (
        motionNetworkState === NetworkMotionState.Finalizable ||
        motionNetworkState === NetworkMotionState.Finalized
      ) {
        const newestStakeOrVoteEvent = sortedEvents.find(
          (event) =>
            event.name === ColonyAndExtensionsEvents.MotionStaked ||
            event.name === ColonyAndExtensionsEvents.MotionVoteRevealed,
        );
        if (newestStakeOrVoteEvent) {
          if (
            motion.votes[0].lt(motion.votes[1]) ||
            motion.stakes[0].lt(motion.stakes[1])
          ) {
            systemMessages.push({
              type: ActionsPageFeedType.SystemMessage,
              name: SystemMessagesName.MotionHasPassed,
              createdAt: newestStakeOrVoteEvent.createdAt,
            });
          }
        }
      }

      return Promise.all(systemMessages);
    },
    async motionVoterReward(_, { motionId, colonyAddress, userAddress }) {
      try {
        const votingReputationClient = await colonyManager.getClient(
          ClientType.VotingReputationClient,
          colonyAddress,
        );
        const { domainId } = await votingReputationClient.getMotion(motionId);

        const { data } = await apolloClient.query<
          UserReputationQuery,
          UserReputationQueryVariables
        >({
          query: UserReputationDocument,
          variables: {
            colonyAddress,
            address: userAddress,
            domainId: domainId.toNumber(),
          },
        });
        if (data?.userReputation) {
          const reward = await votingReputationClient.getVoterReward(
            bigNumberify(motionId),
            bigNumberify(data.userReputation),
          );
          return reward.toString();
        }
        return null;
      } catch (error) {
        console.error('Could not fetch users vote reward');
        console.error(error);
        return null;
      }
    },
    async eventsForMotion(_, { motionId, colonyAddress }) {
      try {
        const votingReputationClient = (await colonyManager.getClient(
          ClientType.VotingReputationClient,
          colonyAddress,
        )) as ExtensionClient;

        return await getMotionEvents(votingReputationClient, motionId);
      } catch (error) {
        console.error(error);
        return [];
      }
    },
    async motionCurrentUserVoted(_, { motionId, colonyAddress, userAddress }) {
      try {
        const votingReputationClient = await colonyManager.getClient(
          ClientType.VotingReputationClient,
          colonyAddress,
        );
        // @ts-ignore
        // eslint-disable-next-line max-len
        const motionVoteFilter = votingReputationClient.filters.MotionVoteSubmitted(
          bigNumberify(motionId),
          userAddress,
        );
        const voteSubmittedEvents = await getEvents(
          votingReputationClient,
          motionVoteFilter,
        );
        return !!voteSubmittedEvents.length;
      } catch (error) {
        console.error('Could not fetch current user vote status');
        console.error(error);
        return null;
      }
    },
    async motionUserVoteRevealed(_, { motionId, colonyAddress, userAddress }) {
      try {
        let userVote = {
          revealed: false,
          vote: null,
        };
        const votingReputationClient = await colonyManager.getClient(
          ClientType.VotingReputationClient,
          colonyAddress,
        );
        // @ts-ignore
        // eslint-disable-next-line max-len
        const motionVoteRevealedFilter = votingReputationClient.filters.MotionVoteRevealed(
          bigNumberify(motionId),
          userAddress,
          null,
        );
        const [userReveal] = await getEvents(
          votingReputationClient,
          motionVoteRevealedFilter,
        );
        if (userReveal) {
          userVote = {
            revealed: true,
            vote: userReveal.values.vote.toNumber(),
          };
        }
        return userVote;
      } catch (error) {
        console.error('Could not fetch user vote revealed state');
        console.error(error);
        return null;
      }
    },
    async motionVoteResults(_, { motionId, colonyAddress, userAddress }) {
      try {
        const voteResult: {
          currentUserVoteSide: number | null;
          yayVotes: string | null;
          yayVoters: string[];
          nayVotes: string | null;
          nayVoters: string[];
        } = {
          currentUserVoteSide: null,
          yayVotes: null,
          yayVoters: [],
          nayVotes: null,
          nayVoters: [],
        };
        const votingReputationClient = await colonyManager.getClient(
          ClientType.VotingReputationClient,
          colonyAddress,
        );
        const { votes } = await votingReputationClient.getMotion(motionId);
        voteResult.yayVotes = votes[1].toString();
        voteResult.nayVotes = votes[0].toString();

        // @ts-ignore
        // eslint-disable-next-line max-len
        const motionVoteRevealedFilter = votingReputationClient.filters.MotionVoteRevealed(
          bigNumberify(motionId),
          null,
          null,
        );
        const revealEvents = await getEvents(
          votingReputationClient,
          motionVoteRevealedFilter,
        );
        revealEvents?.map(({ values: { vote, voter } }) => {
          const currentUserVoted =
            createAddress(voter) === createAddress(userAddress);
          /*
           * @NOTE We're using this little hack in order to ensure, that if
           * the currently logged in user was one of the voters, that
           * their avatar is going to show up first in the vote results
           */
          const arrayMethod = currentUserVoted ? 'unshift' : 'push';
          if (currentUserVoted) {
            voteResult.currentUserVoteSide = vote.toNumber();
          }
          if (vote.toNumber() === MotionVote.Yay) {
            voteResult.yayVoters[arrayMethod](createAddress(voter));
          }
          /*
           * @NOTE We expressly declare NAY rather then using "else" to prevent
           * any other *unexpected* values coming from the chain messing up our
           * data (eg if vote was 2 due to weird issues)
           */
          if (vote.toNumber() === MotionVote.Nay) {
            voteResult.nayVoters[arrayMethod](createAddress(voter));
          }
        });
        return voteResult;
      } catch (error) {
        console.error('Could not fetch motion voting results');
        console.error(error);
        return null;
      }
    },
  },
  Motion: {
    async state({ fundamentalChainId, associatedColony: { colonyAddress } }) {
      const motionId = bigNumberify(fundamentalChainId);
      const votingReputationClient = await colonyManager.getClient(
        ClientType.VotingReputationClient,
        createAddress(colonyAddress),
      );
      const motion = await votingReputationClient.getMotion(motionId);
      const state = await votingReputationClient.getMotionState(motionId);
      return getMotionState(
        state,
        votingReputationClient as ExtensionClient,
        motion,
      );
    },
    async type({
      fundamentalChainId,
      associatedColony: { colonyAddress: address },
    }) {
      const colonyAddress = createAddress(address);
      const votingReputationClient = await colonyManager.getClient(
        ClientType.VotingReputationClient,
        colonyAddress,
      );
      const colonyClient = await colonyManager.getClient(
        ClientType.ColonyClient,
        colonyAddress,
      );
      return getMotionActionType(
        votingReputationClient as ExtensionClient,
        colonyClient,
        bigNumberify(fundamentalChainId),
      );
    },
    async args({ action, associatedColony: { colonyAddress } }) {
      const colonyClient = await colonyManager.getClient(
        ClientType.ColonyClient,
        colonyAddress,
      );
      const actionValues = colonyClient.interface.parseTransaction({
        data: action,
      });
      const tokenAddress = colonyClient.tokenClient.address;
      const {
        symbol,
        decimals,
      } = await colonyClient.tokenClient.getTokenInfo();
      /*
       * @TODO Return argumnents for the other motions as well, as soon
       * as they get wired into the dapp
       */
      return {
        amount: bigNumberify(actionValues?.args[0] || '0').toString(),
        token: {
          id: tokenAddress,
          symbol,
          decimals,
        },
      };
    },
  },
});
