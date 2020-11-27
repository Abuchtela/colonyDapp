import React, { useMemo } from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';

import NavLink from '~core/NavLink';
import Heading from '~core/Heading';
import HookedUserAvatar from '~users/HookedUserAvatar';
import { SpinnerLoader } from '~core/Preloaders';

import { Colony, useColonyMembersWithReputationQuery } from '~data/index';
import { Address } from '~types/index';
import { COLONY_TOTAL_BALANCE_DOMAIN_ID } from '~constants';

import styles from './ColonyMembers.css';

const MSG = defineMessages({
  title: {
    id: 'dashboard.ColonyHome.ColonyMembers.title',
    defaultMessage: `Members{hasCounter, select,
      true { ({count})}
      false {}
    }`,
  },
  loadingData: {
    id: 'dashboard.ColonyHome.ColonyMembers.loadingData',
    defaultMessage: 'Loading members information...',
  },
  reputationFetchFailed: {
    id: 'dashboard.ColonyHome.ColonyMembers.reputationFetchFailed',
    defaultMessage: "Failed to fetch the colony's members",
  },
});

interface Props {
  colony: Colony;
  currentDomainId?: number;
}

const UserAvatar = HookedUserAvatar({ fetchUser: true });
const MAX_AVATARS = 15;

const displayName = 'dashboard.ColonyHome.ColonyMembers';

const ColonyMembers = ({
  colony: { colonyAddress, colonyName },
  currentDomainId = COLONY_TOTAL_BALANCE_DOMAIN_ID,
}: Props) => {
  const {
    data: members,
    loading: loadingColonyMembersWithReputation,
  } = useColonyMembersWithReputationQuery({
    variables: {
      colonyAddress,
      domainId: currentDomainId,
    },
  });

  const membersPageRoute = useMemo(() => {
    const baseRoute = `/colony/${colonyName}/members`;
    if (currentDomainId === COLONY_TOTAL_BALANCE_DOMAIN_ID) {
      return baseRoute;
    }
    return `${baseRoute}/${currentDomainId}`;
  }, [currentDomainId, colonyName]);

  const avatarsDisplaySplitRules = useMemo(() => {
    if (!members || !members.colonyMembersWithReputation?.length) {
      return 0;
    }

    if (members.colonyMembersWithReputation.length <= MAX_AVATARS) {
      return members.colonyMembersWithReputation.length;
    }
    return MAX_AVATARS - 1;
  }, [members]);

  const remainingAvatarsCount = useMemo(() => {
    if (!members || !members.colonyMembersWithReputation?.length) {
      return 0;
    }

    if (members.colonyMembersWithReputation.length <= MAX_AVATARS) {
      return 0;
    }
    return members.colonyMembersWithReputation.length - MAX_AVATARS;
  }, [members]);

  if (loadingColonyMembersWithReputation) {
    return (
      <div className={styles.main}>
        <Heading
          appearance={{ size: 'normal', weight: 'bold' }}
          text={MSG.title}
          textValues={{ hasCounter: false }}
        />
        <SpinnerLoader appearance={{ size: 'small' }} />
        <span className={styles.loadingText}>
          <FormattedMessage {...MSG.loadingData} />
        </span>
      </div>
    );
  }

  if (!members || !members.colonyMembersWithReputation) {
    return (
      <div className={styles.main}>
        <Heading
          appearance={{ size: 'normal', weight: 'bold' }}
          text={MSG.title}
          textValues={{ hasCounter: false }}
        />
        <span className={styles.loadingText}>
          <FormattedMessage {...MSG.reputationFetchFailed} />
        </span>
      </div>
    );
  }

  const { colonyMembersWithReputation } = members;

  return (
    <div className={styles.main}>
      <NavLink to={membersPageRoute}>
        <Heading
          appearance={{ size: 'normal', weight: 'bold' }}
          text={MSG.title}
          textValues={{
            count: colonyMembersWithReputation.length,
            hasCounter: true,
          }}
        />
      </NavLink>
      <ul className={styles.userAvatars}>
        {(colonyMembersWithReputation as Address[])
          .slice(0, avatarsDisplaySplitRules)
          .map((userAddress: Address) => (
            <li className={styles.userAvatar} key={userAddress}>
              <UserAvatar
                size="xs"
                colonyAddress={colonyAddress}
                address={userAddress}
                showInfo
                notSet={false}
                popperProps={{
                  placement: 'bottom',
                  showArrow: false,
                  modifiers: [
                    {
                      name: 'offset',
                      options: {
                        /*
                         * @NOTE Values are set manual, exactly as the ones provided in the figma spec.
                         *
                         * There's no logic to how they are calculated, so next time you need
                         * to change them you'll either have to go by exact specs, or change
                         * them until it "feels right" :)
                         */
                        offset: [-208, -12],
                      },
                    },
                  ],
                }}
              />
            </li>
          ))}
        {!!remainingAvatarsCount && (
          <li className={styles.remaningAvatars}>
            {remainingAvatarsCount < 99 ? remainingAvatarsCount : `>99`}
          </li>
        )}
      </ul>
    </div>
  );
};

ColonyMembers.displayName = displayName;

export default ColonyMembers;
