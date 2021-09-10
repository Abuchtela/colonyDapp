import { ROOT_DOMAIN_ID } from '@colony/colony-js';
import React from 'react';
import { defineMessage, FormattedMessage } from 'react-intl';

import { getMainClasses } from '~utils/css';
import DialogSection from '~core/Dialog/DialogSection';

import styles from './NotEnoughReputation.css';

interface Appearance {
  marginTop?: 'negative';
}

interface Props {
  domainId?: number;
  appearance?: Appearance;
}

const MSG = defineMessage({
  title: {
    id: 'NotEnoughReputation.title',
    defaultMessage: `There is no reputation in this {onRootDomain, select,
      true {colony}
      false {team}
    } yet.`,
  },
  description: {
    id: 'NotEnoughReputation.description',
    defaultMessage: `Please create the motion in a parent of this domain where there is reputation. Alternatively, if you have the necessary permissions to take this action, you may toggle the "Force" switch in the top right corner of this modal to bypass the governance process.`,
  },
});

const displayName = 'NotEnoughReputation';

const NotEnoughReputation = ({
  domainId = ROOT_DOMAIN_ID,
  appearance,
}: Props) => (
  <div className={`${styles.container} ${getMainClasses(appearance, styles)}`}>
    <DialogSection appearance={{ theme: 'sidePadding' }}>
      <p className={styles.title}>
        <FormattedMessage
          {...MSG.title}
          values={{ onRootDomain: domainId === ROOT_DOMAIN_ID }}
        />
      </p>
      <p className={styles.text}>
        <FormattedMessage {...MSG.description} />
      </p>
    </DialogSection>
  </div>
);

NotEnoughReputation.displayName = displayName;

export default NotEnoughReputation;
