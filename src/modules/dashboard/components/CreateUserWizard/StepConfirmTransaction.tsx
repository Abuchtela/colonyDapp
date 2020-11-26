import React from 'react';
import { defineMessages } from 'react-intl';
import { Redirect } from 'react-router-dom';

import { LANDING_PAGE_ROUTE } from '~routes/index';
import { useSelector } from '~utils/hooks';
import { useLoggedInUser } from '~data/index';

import { groupedTransactions } from '../../../core/selectors';
import {
  findTransactionGroupByKey,
  findNewestGroup,
} from '~users/GasStation/transactionGroup';
import Heading from '~core/Heading';
import GasStationContent from '~users/GasStation/GasStationContent';
import styles from './StepConfirmTransaction.css';

const MSG = defineMessages({
  heading: {
    id: 'dashboard.CreateUserWizard.StepConfirmTransaction.heading',
    defaultMessage: `Complete this transaction to continue
      setting up your account`,
  },
});

const displayName = 'dashboard.CreateUserWizard.StepConfirmTransaction';

const StepConfirmTransaction = () => {
  const { username } = useLoggedInUser();
  const transactionGroups = useSelector(groupedTransactions);

  if (username) {
    return <Redirect to={LANDING_PAGE_ROUTE} />;
  }

  const colonyTransaction = findTransactionGroupByKey(
    [findNewestGroup(transactionGroups)],
    'group.transaction.batch.createUser',
  );

  return (
    <section className={styles.main}>
      <Heading
        appearance={{ size: 'medium', weight: 'medium' }}
        text={MSG.heading}
      />
      <div className={styles.container}>
        {colonyTransaction && (
          <GasStationContent
            appearance={{ interactive: false, required: true }}
            transactionAndMessageGroups={[colonyTransaction]}
          />
        )}
      </div>
    </section>
  );
};

StepConfirmTransaction.displayName = displayName;

export default StepConfirmTransaction;
