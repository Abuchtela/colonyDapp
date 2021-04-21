import React, { useCallback } from 'react';
import { FormikProps } from 'formik';
import { defineMessages, FormattedMessage } from 'react-intl';
import { ROOT_DOMAIN_ID } from '@colony/colony-js';

import { bigNumberify } from 'ethers/utils';
import Button from '~core/Button';
import { ActionForm } from '~core/Fields';
import Heading from '~core/Heading';
import QuestionMarkTooltip from '~core/QuestionMarkTooltip';

import {
  Colony,
  useLoggedInUser,
  useMotionVoteResultsQuery,
  useMotionCurrentUserVotedQuery,
} from '~data/index';
import { ActionTypes } from '~redux/index';
import { ColonyMotions } from '~types/index';
import { mapPayload } from '~utils/actions';
import { getMainClasses } from '~utils/css';

import VoteResults from './VoteResults';

import styles from './FinalizeMotionWidget.css';

interface Props {
  colony: Colony;
  motionId: number;
  actionType: string;
  motionDomain: number;
}

const MSG = defineMessages({
  /*
   * @NOTE I didn't want to create a mapping for this, since they will only
   * be used in this instance
   *
   * If by chance we end up having to use this mapping elsewhere, feel free
   * to create it's own map
   */
  title: {
    id: 'dashboard.ActionsPage.FinalizeMotionWidget.title',
    defaultMessage: `Should "{actionType, select,
      ${ColonyMotions.MintTokensMotion} {Mint tokens}
      other {Generic Action}
    }" be approved?`,
  },
  finalizeLabel: {
    id: 'dashboard.ActionsPage.FinalizeMotionWidget.finalizeLabel',
    defaultMessage: `Finalize motion`,
  },
  finalizeTooltip: {
    id: 'dashboard.ActionsPage.FinalizeMotionWidget.finalizeTooltip',
    defaultMessage: `[TO BE ADDED WHEN AVAILABLE]`,
  },
  finalizeButton: {
    id: 'dashboard.ActionsPage.FinalizeMotionWidget.finalizeButton',
    defaultMessage: `Finalize`,
  },
  outcomeCelebration: {
    id: 'dashboard.ActionsPage.FinalizeMotionWidget.outcomeCelebration',
    defaultMessage: `{outcome, select,
      true {🎉 Congratulations, your side won!}
      other {Sorry, your side lost!}
    }`,
  },
});

const FinalizeMotionWidget = ({
  colony: { colonyAddress },
  colony,
  motionId,
  actionType,
  motionDomain = ROOT_DOMAIN_ID,
}: Props) => {
  const { walletAddress, username, ethereal } = useLoggedInUser();
  const { data } = useMotionVoteResultsQuery({
    variables: {
      colonyAddress,
      userAddress: walletAddress,
      motionId,
    },
  });

  const { data: userVoted } = useMotionCurrentUserVotedQuery({
    variables: {
      colonyAddress,
      userAddress: walletAddress,
      motionId,
    },
  });

  const transform = useCallback(
    mapPayload(() => ({
      colonyAddress,
      walletAddress,
    })),
    [],
  );

  const hasRegisteredProfile = !!username && !ethereal;
  const hasVotes =
    bigNumberify(data?.motionVoteResults?.nayVotes || 0).gt(0) ||
    bigNumberify(data?.motionVoteResults?.yayVotes || 0).gt(0);

  /*
   * If the motion is in the Root domain, it cannot be escalated further
   * meaning it can be finalized directly
   */
  const showFinalizeButton =
    data?.motionVoteResults && motionDomain === ROOT_DOMAIN_ID;

  return (
    <ActionForm
      initialValues={{}}
      submit={ActionTypes.COLONY_ACTION_GENERIC}
      error={ActionTypes.COLONY_ACTION_GENERIC_ERROR}
      success={ActionTypes.COLONY_ACTION_GENERIC_SUCCESS}
      transform={transform}
    >
      {({ handleSubmit, isSubmitting }: FormikProps<{}>) => (
        <div
          className={getMainClasses({}, styles, {
            marginBottom: showFinalizeButton || false,
          })}
        >
          {showFinalizeButton && (
            <div className={styles.itemWithForcedBorder}>
              <div className={styles.label}>
                <div>
                  <FormattedMessage {...MSG.finalizeLabel} />
                  <QuestionMarkTooltip
                    tooltipText={MSG.finalizeTooltip}
                    className={styles.help}
                    tooltipClassName={styles.tooltip}
                    tooltipPopperProps={{
                      placement: 'right',
                    }}
                  />
                </div>
              </div>
              <div className={styles.value}>
                <Button
                  appearance={{ theme: 'primary', size: 'medium' }}
                  text={MSG.finalizeButton}
                  disabled={!hasRegisteredProfile}
                  onClick={() => handleSubmit()}
                  loading={isSubmitting}
                />
              </div>
            </div>
          )}
          <div className={styles.voteResults}>
            {hasRegisteredProfile &&
              data?.motionVoteResults &&
              hasVotes &&
              userVoted?.motionCurrentUserVoted && (
                <div className={styles.outcome}>
                  <FormattedMessage
                    {...MSG.outcomeCelebration}
                    values={{
                      outcome: !!data?.motionVoteResults?.currentUserVoteSide,
                    }}
                  />
                </div>
              )}
            {hasVotes && (
              /*
               * @NOTE If we have votes **AND** we're in a finalizable state (this is checked on the action page)
               * then we are in a VOTING flow that needs to be finalized.
               * Othewise, we're in a STAKING flow that needs to be finalized.
               */
              <>
                <Heading
                  text={MSG.title}
                  textValues={{ actionType }}
                  appearance={{ size: 'normal', theme: 'dark', margin: 'none' }}
                />
                <VoteResults
                  /*
                   * @NOTE We are not passing down the `motionVoteResults` values
                   * since the `VoteResults` component is designed to work independent
                   * of this widget (since we'll need to use it in a system message)
                   */
                  colony={colony}
                  motionId={motionId}
                />
              </>
            )}
          </div>
        </div>
      )}
    </ActionForm>
  );
};

FinalizeMotionWidget.displayName = 'dashboard.ActionsPage.FinalizeMotionWidget';

export default FinalizeMotionWidget;
