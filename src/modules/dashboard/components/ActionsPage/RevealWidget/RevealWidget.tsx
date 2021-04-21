import React, { useCallback } from 'react';
import { FormikProps } from 'formik';
import { defineMessages, FormattedMessage } from 'react-intl';

import Button from '~core/Button';
import { ActionForm, CustomRadio } from '~core/Fields';
import Heading from '~core/Heading';

import {
  Colony,
  useLoggedInUser,
  useMotionUserVoteRevealedQuery,
  useMotionCurrentUserVotedQuery,
} from '~data/index';
import { ActionTypes } from '~redux/index';
import { mapPayload } from '~utils/actions';
import { MotionVote } from '~utils/colonyMotions';

import VoteDetails from '../VoteWidget/VoteDetails';

import styles from './RevealWidget.css';

export interface FormValues {
  vote: string;
}

interface Props {
  colony: Colony;
  motionId: number;
}

const MSG = defineMessages({
  title: {
    id: 'dashboard.ActionsPage.RevealWidget.title',
    defaultMessage: `{revealed, select,
      true {Waiting for other voters to reveal their votes.}
      other {Reveal your vote to others to claim your reward.}
    }`,
  },
  titleNotVoted: {
    id: 'dashboard.ActionsPage.RevealWidget.titleNotVoted',
    defaultMessage: `Please wait for the voters to reveal their vote.`,
  },
  voteHiddenInfo: {
    id: 'dashboard.ActionsPage.RevealWidget.voteHiddenInfo',
    defaultMessage: `Your vote is hidden from others.`,
  },
  buttonReveal: {
    id: 'dashboard.ActionsPage.RevealWidget.buttonReveal',
    defaultMessage: `Reveal`,
  },
});

const RevealWidget = ({
  colony: { colonyAddress },
  colony,
  motionId,
}: Props) => {
  const { walletAddress, username, ethereal } = useLoggedInUser();

  const { data: voteRevealed } = useMotionUserVoteRevealedQuery({
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
    mapPayload(({ vote }) => ({
      colonyAddress,
      walletAddress,
      vote: parseInt(vote, 10),
    })),
    [],
  );

  const hasRegisteredProfile = !!username && !ethereal;
  const revealed = voteRevealed?.motionUserVoteRevealed?.revealed;
  const vote = voteRevealed?.motionUserVoteRevealed?.vote;

  return (
    <ActionForm
      initialValues={{}}
      submit={ActionTypes.COLONY_ACTION_GENERIC}
      error={ActionTypes.COLONY_ACTION_GENERIC_ERROR}
      success={ActionTypes.COLONY_ACTION_GENERIC_SUCCESS}
      transform={transform}
    >
      {({ handleSubmit, isSubmitting }: FormikProps<FormValues>) => (
        <div className={styles.main}>
          {userVoted?.motionCurrentUserVoted ? (
            <Heading
              text={MSG.title}
              textValues={{
                revealed,
              }}
              appearance={{ size: 'normal', theme: 'dark', margin: 'none' }}
            />
          ) : (
            <Heading
              text={MSG.titleNotVoted}
              appearance={{ size: 'normal', theme: 'dark', margin: 'none' }}
            />
          )}

          {revealed ? (
            <>
              {vote === MotionVote.Yay ? (
                <CustomRadio
                  /*
                   * @NOTE This is just for display purposes, we don't actually
                   * want to use it as radio button
                   */
                  value=""
                  name="voteYes"
                  label={{ id: 'button.yes' }}
                  appearance={{ theme: 'primary' }}
                  icon="circle-thumbs-up"
                  checked
                />
              ) : (
                <CustomRadio
                  /*
                   * @NOTE This is just for display purposes, we don't actually
                   * want to use it as radio button
                   */
                  value=""
                  name="voteNo"
                  label={{ id: 'button.no' }}
                  appearance={{ theme: 'danger' }}
                  icon="circle-thumbs-down"
                  checked
                />
              )}
            </>
          ) : (
            <>
              {userVoted?.motionCurrentUserVoted && (
                <div className={styles.voteHiddenInfo}>
                  <FormattedMessage {...MSG.voteHiddenInfo} />
                </div>
              )}
            </>
          )}
          <VoteDetails
            colony={colony}
            motionId={motionId}
            showReward={userVoted?.motionCurrentUserVoted}
            buttonComponent={
              <Button
                appearance={{ theme: 'primary', size: 'medium' }}
                text={MSG.buttonReveal}
                disabled={
                  !hasRegisteredProfile ||
                  revealed ||
                  !userVoted?.motionCurrentUserVoted
                }
                onClick={() => handleSubmit()}
                loading={isSubmitting}
              />
            }
          />
        </div>
      )}
    </ActionForm>
  );
};

RevealWidget.displayName = 'dashboard.ActionsPage.RevealWidget';

export default RevealWidget;
