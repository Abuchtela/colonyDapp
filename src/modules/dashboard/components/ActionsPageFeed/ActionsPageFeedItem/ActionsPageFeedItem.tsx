import React from 'react';

import { TransactionMeta } from '~dashboard/ActionsPage';
import UserMention from '~core/UserMention';
import HookedUserAvatar from '~users/HookedUserAvatar';

import { getMainClasses } from '~utils/css';
import TextDecorator from '~lib/TextDecorator';
import { Address } from '~types/index';
import { useUser } from '~data/index';
import { getFriendlyName } from '../../../../users/transformers';

import styles from './ActionsPageFeedItem.css';

const displayName = 'dashboard.ActionsPageFeed.ActionsPageFeedItem';

interface Props {
  comment?: string;
  walletAddress: Address;
  annotation?: boolean;
  createdAt?: Date | number;
}

const ActionsPageFeedItem = ({
  comment,
  walletAddress,
  createdAt,
  annotation = false,
}: Props) => {
  const { Decorate } = new TextDecorator({
    username: (usernameWithAtSign) => (
      <UserMention username={usernameWithAtSign.slice(1)} />
    ),
  });

  const UserAvatar = HookedUserAvatar({ fetchUser: false });

  const user = useUser(walletAddress);

  return (
    <div className={getMainClasses({}, styles, { annotation })}>
      <div className={styles.avatar}>
        <UserAvatar
          size="xs"
          address={walletAddress}
          user={user}
          showInfo
          notSet={false}
        />
      </div>
      <div className={styles.content}>
        <div className={styles.details}>
          <span className={styles.username}>{getFriendlyName(user)}</span>
          {createdAt && <TransactionMeta createdAt={createdAt} />}
        </div>
        <div className={styles.text}>
          <Decorate>{comment}</Decorate>
        </div>
      </div>
    </div>
  );
};

ActionsPageFeedItem.displayName = displayName;

export default ActionsPageFeedItem;