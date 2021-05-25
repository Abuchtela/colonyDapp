import React, { ReactNode, useCallback } from 'react';
import { ROOT_DOMAIN_ID } from '@colony/colony-js';
import { useIntl } from 'react-intl';

import { Form, SelectOption } from '~core/Fields';
import DomainDropdown from '~core/DomainDropdown';

import { Colony } from '~data/index';

import styles from './MotionDomainSelect.css';

interface Props {
  colony: Colony;
  initialSelectedDomain?: number;
  disabled?: boolean;
  name?: string;
  handleSubmit?: () => any;
  onDomainChange?: (domainId: number) => any;
}

const displayName = 'dashboard.MotionDomainSelect';

const MotionDomainSelect = ({
  initialSelectedDomain = ROOT_DOMAIN_ID,
  colony,
  disabled = false,
  name = 'motionDomainId',
  handleSubmit = () => {},
  onDomainChange,
}: Props) => {
  const { formatMessage } = useIntl();
  const renderActiveOption = useCallback<
    (option: SelectOption | undefined, label: string) => ReactNode
  >(
    (option, label) => {
      /*
       * @NOTE This is so that the active item is displayed as `Root/Current Domain`
       * when a subdomain is selected
       */
      const displayLabel =
        parseInt(option?.value || `${ROOT_DOMAIN_ID}`, 10) === ROOT_DOMAIN_ID
          ? label
          : `${formatMessage({ id: 'domain.root' })}/${label}`;
      return <div className={styles.activeItem}>{displayLabel}</div>;
    },
    [formatMessage],
  );

  return (
    /*
     * @NOTE This form's single purpouse is to display the correct active select value
     * It's not wired to anything, and will not send the value anywhere, but since
     * it has an underlying `Select` component, it won't work otherwise
     */
    <Form
      initialValues={{
        motionDomainId: String(initialSelectedDomain),
      }}
      onSubmit={handleSubmit}
    >
      <div className={styles.main}>
        <DomainDropdown
          colony={colony}
          name={name}
          currentDomainId={initialSelectedDomain}
          renderActiveOptionFn={renderActiveOption}
          onDomainChange={onDomainChange}
          showAllDomains={false}
          showDescription={false}
          disabled={disabled}
        />
      </div>
    </Form>
  );
};

MotionDomainSelect.displayName = displayName;

export default MotionDomainSelect;
