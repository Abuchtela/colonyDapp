import React, { useCallback } from 'react';
import {
  FormattedMessage,
  defineMessages,
  FormattedDateParts,
} from 'react-intl';
import { useTokenQuery, ColonyTransaction } from '~data/index';
import { mergePayload } from '~utils/actions';
import { ActionTypes } from '~redux/index';
import { ActionButton } from '~core/Button';
import MaskedAddress from '~core/MaskedAddress';
import Numeral from '~core/Numeral';
import { getTokenDecimalsWithFallback } from '~utils/tokens';

import styles from './UnclaimedTransfersItem.css';

const displayName = 'UnclaimedTransfers.UnclaimedTransfersItem';

const MSG = defineMessages({
  buttonClaim: {
    id: 'dashboard.UnclaimedTransfers.UnclaimedTransfersItem.buttonClaim',
    defaultMessage: 'Claim',
  },
  from: {
    id: 'dashboard.UnclaimedTransfers.UnclaimedTransfersItem.from',
    defaultMessage: 'From {sender}',
  },
});

interface Props {
  transaction: ColonyTransaction;
}

const UnclaimedTransfersItem = ({
  transaction: {
    amount,
    colonyAddress,
    date,
    token: tokenAddress,
    from: senderAddress,
  },
}: Props) => {
  const { data: tokenData } = useTokenQuery({
    variables: { address: tokenAddress },
  });

  const transform = useCallback(mergePayload({ colonyAddress, tokenAddress }), [
    colonyAddress,
    tokenAddress,
  ]);

  // @TODO: use proper preloader
  if (!tokenData) return null;

  const { token } = tokenData;

  return (
    <li>
      <div className={styles.content}>
        <div className={styles.details}>
          <div className={styles.sender}>
            {senderAddress && (
              <FormattedMessage
                {...MSG.from}
                values={{
                  sender: <MaskedAddress address={senderAddress} />,
                }}
              />
            )}
          </div>
          <div className={styles.date}>
            <FormattedDateParts value={date} month="short" day="numeric">
              {(parts) => (
                <>
                  <span>{parts[2].value}</span>
                  <span>{parts[0].value}</span>
                </>
              )}
            </FormattedDateParts>
          </div>
        </div>
        <Numeral
          value={amount}
          unit={getTokenDecimalsWithFallback(token.decimals)}
          suffix={` ${token.symbol}`}
          className={styles.amount}
        />
        <ActionButton
          text={MSG.buttonClaim}
          className={styles.button}
          submit={ActionTypes.COLONY_CLAIM_TOKEN}
          error={ActionTypes.COLONY_CLAIM_TOKEN_ERROR}
          success={ActionTypes.COLONY_CLAIM_TOKEN_SUCCESS}
          transform={transform}
        />
      </div>
    </li>
  );
};

UnclaimedTransfersItem.displayName = displayName;

export default UnclaimedTransfersItem;
