import React, { useCallback, useState } from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';
import * as yup from 'yup';

import Heading from '~core/Heading';
import QuestionMarkTooltip from '~core/QuestionMarkTooltip';
import { Form, Toggle } from '~core/Fields';

import { useUserSettings, SlotKey } from '~utils/hooks/useUserSettings';
import { useLoggedInUser } from '~data/helpers';
import { canUseMetatransactions } from '../../checks';

import styles from './UserProfileEdit.css';
import stylesAdvance from './UserAdvanceSettings.css';

const MSG = defineMessages({
  heading: {
    id: 'users.UserProfileEdit.UserAdvanceSettings.heading',
    defaultMessage: 'Advanced settings',
  },
  metaDesc: {
    id: 'users.UserProfileEdit.UserAdvanceSettings.metaDesc',
    defaultMessage: `You have turned off metatransactions. Please, make sure to switch to xDai RPC in your Metamask.`,
  },
  labelMetaTx: {
    id: 'users.UserProfileEdit.UserAdvanceSettings.labelMetaTx',
    defaultMessage: `Metatransactions ({isOn, select,
      true {on}
      other {off}
    })`,
  },
  tooltip: {
    id: 'users.UserProfileEdit.UserAdvanceSettings.tooltip',
    defaultMessage: `Metatransactions are turned on by default.
    If you would rather connect directly to xDai chain,
    and pay for your own transactions, you can turn them off
    by switching the toggle at any time. {br}{br} Please note,
    this setting is stored locally in your browser,
    if you clear your cache you will need to turn Metatransactions off again.`,
  },
});

interface FormValues {
  metatransactions: boolean;
}

const validationSchema = yup.object({
  metatransactions: yup.bool(),
});

const displayName = 'users.UserProfileEdit.UserAdvanceSettings';

const UserAdvanceSettings = () => {
  const { networkId: userWalletNetworkId } = useLoggedInUser();

  const {
    settings: { metatransactions: metatransactionsSetting },
    setSettingsKey,
  } = useUserSettings();

  const [metatransactionsToggle, setMetatransactionsToggle] = useState<boolean>(
    metatransactionsSetting,
  );

  const onChange = useCallback(
    (oldValue) => {
      setSettingsKey(SlotKey.Metatransactions, !oldValue);
      setMetatransactionsToggle(!oldValue);
    },
    [setSettingsKey],
  );

  const metatransasctionsAvailable = canUseMetatransactions(
    userWalletNetworkId as number,
  );

  return (
    <>
      <Form<FormValues>
        initialValues={{
          metatransactions: metatransasctionsAvailable
            ? metatransactionsSetting
            : false,
        }}
        validationSchema={validationSchema}
        onSubmit={() => {}}
      >
        {({ values }) => (
          <div className={styles.main}>
            <Heading
              appearance={{ theme: 'dark', size: 'medium' }}
              text={MSG.heading}
            />
            <div className={stylesAdvance.toggleContainer}>
              <Toggle
                label={MSG.labelMetaTx}
                labelValues={{
                  isOn: metatransasctionsAvailable
                    ? metatransactionsToggle
                    : false,
                }}
                name="metatransactions"
                disabled={!metatransasctionsAvailable}
                onChange={onChange}
              />
              <QuestionMarkTooltip
                tooltipText={MSG.tooltip}
                tooltipTextValues={{ br: <br /> }}
                className={stylesAdvance.tooltipContainer}
                tooltipClassName={stylesAdvance.tooltipContent}
                tooltipPopperOptions={{
                  placement: 'right',
                }}
              />
            </div>
            {!values.metatransactions && (
              <div className={stylesAdvance.metaDesc}>
                <FormattedMessage {...MSG.metaDesc} />
              </div>
            )}
          </div>
        )}
      </Form>
    </>
  );
};

UserAdvanceSettings.displayName = displayName;

export default UserAdvanceSettings;
