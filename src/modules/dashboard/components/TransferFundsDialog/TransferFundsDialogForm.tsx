import React, { useMemo, useEffect } from 'react';
import { FormikProps } from 'formik';
import { defineMessages, FormattedMessage } from 'react-intl';
import { bigNumberify } from 'ethers/utils';
import moveDecimal from 'move-decimal-point';
import sortBy from 'lodash/sortBy';
import { ColonyRole, ROOT_DOMAIN_ID } from '@colony/colony-js';
import { AddressZero } from 'ethers/constants';

import { useTransformer } from '~utils/hooks';
import Button from '~core/Button';
import DialogSection from '~core/Dialog/DialogSection';
import { Select, Input, FormStatus, Textarea } from '~core/Fields';
import Heading from '~core/Heading';
import {
  useLoggedInUser,
  useTokenBalancesForDomainsLazyQuery,
  Colony,
} from '~data/index';
import EthUsd from '~core/EthUsd';
import Numeral from '~core/Numeral';
import {
  getBalanceFromToken,
  getTokenDecimalsWithFallback,
} from '~utils/tokens';

import { getUserRolesForDomain } from '../../../transformers';
import { userHasRole } from '../../../users/checks';

import styles from './TransferFundsDialogForm.css';
import { FormValues } from './TransferFundsDialog';
import Icon from '~core/Icon';

const MSG = defineMessages({
  title: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.title',
    defaultMessage: 'Transfer Funds',
  },
  from: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.from',
    defaultMessage: 'From',
  },
  to: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.to',
    defaultMessage: 'To',
  },
  amount: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.amount',
    defaultMessage: 'Amount',
  },
  token: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.address',
    defaultMessage: 'Token',
  },
  reason: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.reason',
    defaultMessage: 'Explain why you’re transferring these funds (optional)',
  },
  domainTokenAmount: {
    id:
      'dashboard.TransferFundsDialog.TransferFundsDialogForm.domainTokenAmount',
    defaultMessage: 'Available: {amount} {symbol}',
  },
  noAmount: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.noAmount',
    defaultMessage: 'Amount must be greater than zero',
  },
  noBalance: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.noBalance',
    defaultMessage: 'Insufficient balance in from domain pot',
  },
  noPermissionFrom: {
    id:
      'dashboard.TransferFundsDialog.TransferFundsDialogForm.noPermissionFrom',
    defaultMessage: 'No permission in from domain',
  },
  noPermissionTo: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.noPermissionTo',
    defaultMessage: 'No permission in to domain',
  },
  samePot: {
    id: 'dashboard.TransferFundsDialog.TransferFundsDialogForm.samePot',
    defaultMessage: 'Cannot move to same domain pot',
  },
  transferIconTitle: {
    id:
      'dashboard.TransferFundsDialog.TransferFundsDialogForm.transferIconTitle',
    defaultMessage: 'Transfer',
  },
});

interface Props {
  cancel: () => void;
  colony: Colony;
}

const TransferFundsDialogForm = ({
  cancel,
  colony,
  colony: { colonyAddress, domains, tokens },
  handleSubmit,
  isSubmitting,
  isValid,
  setErrors,
  status,
  values,
}: Props & FormikProps<FormValues>) => {
  const { tokenAddress, amount } = values;
  const fromDomain = values.fromDomain
    ? parseInt(values.fromDomain, 10)
    : ROOT_DOMAIN_ID;
  const toDomain = values.toDomain
    ? parseInt(values.toDomain, 10)
    : ROOT_DOMAIN_ID;

  const selectedToken = useMemo(
    () => tokens.find((token) => token.address === values.tokenAddress),
    [tokens, values.tokenAddress],
  );

  const tokenOptions = useMemo(
    () =>
      tokens.map(({ address, symbol }) => ({
        value: address,
        label: symbol || '???',
      })),
    [tokens],
  );

  const { walletAddress } = useLoggedInUser();

  const fromDomainRoles = useTransformer(getUserRolesForDomain, [
    colony,
    walletAddress,
    fromDomain,
  ]);

  const toDomainRoles = useTransformer(getUserRolesForDomain, [
    colony,
    walletAddress,
    toDomain,
  ]);

  const domainOptions = useMemo(
    () =>
      sortBy(
        domains.map(({ name, ethDomainId }) => ({
          value: ethDomainId.toString(),
          label: name,
        })),
        ['value'],
      ),

    [domains],
  );

  const [
    loadTokenBalances,
    { data: tokenBalancesData },
  ] = useTokenBalancesForDomainsLazyQuery();

  useEffect(() => {
    if (tokenAddress) {
      loadTokenBalances({
        variables: {
          colonyAddress,
          tokenAddresses: [tokenAddress],
          domainIds: [fromDomain, toDomain],
        },
      });
    }
  }, [colonyAddress, tokenAddress, fromDomain, toDomain, loadTokenBalances]);

  const fromDomainTokenBalance = useMemo(() => {
    const token =
      tokenBalancesData &&
      tokenBalancesData.tokens.find(({ address }) => address === tokenAddress);
    const from = getBalanceFromToken(token, fromDomain);
    return from;
  }, [fromDomain, tokenAddress, tokenBalancesData]);

  // Perform form validations
  useEffect(() => {
    const errors: {
      amount?: any;
      fromDomain?: any;
      toDomain?: any;
    } = {};

    if (!selectedToken || !(amount && amount.length)) {
      errors.amount = undefined; // silent error
    } else {
      const convertedAmount = bigNumberify(
        moveDecimal(
          amount,
          getTokenDecimalsWithFallback(selectedToken.decimals),
        ),
      );
      if (!convertedAmount.eq(0)) {
        errors.amount = MSG.noAmount;
      } else if (
        fromDomainTokenBalance &&
        fromDomainTokenBalance.lt(convertedAmount)
      ) {
        errors.amount = MSG.noBalance;
      }
    }

    if (fromDomain && !userHasRole(fromDomainRoles, ColonyRole.Funding)) {
      errors.fromDomain = MSG.noPermissionFrom;
    }

    if (toDomain && !userHasRole(toDomainRoles, ColonyRole.Funding)) {
      errors.toDomain = MSG.noPermissionTo;
    }

    if (toDomain !== undefined && toDomain === fromDomain) {
      errors.toDomain = MSG.samePot;
    }

    setErrors(errors);
  }, [
    amount,
    fromDomain,
    fromDomainRoles,
    fromDomainTokenBalance,
    selectedToken,
    setErrors,
    toDomain,
    toDomainRoles,
  ]);

  return (
    <>
      <FormStatus status={status} />
      <DialogSection>
        <Heading
          appearance={{ size: 'medium', margin: 'none' }}
          text={MSG.title}
          className={styles.title}
        />
      </DialogSection>
      <DialogSection>
        <div className={styles.domainSelects}>
          <div>
            <Select
              options={domainOptions}
              label={MSG.from}
              name="fromDomain"
              appearance={{ theme: 'grey' }}
            />
            {!!tokenAddress && (
              <div className={styles.domainPotBalance}>
                <FormattedMessage
                  {...MSG.domainTokenAmount}
                  values={{
                    amount: (
                      <Numeral
                        appearance={{
                          size: 'small',
                          theme: 'grey',
                        }}
                        value={fromDomainTokenBalance || 0}
                        unit={getTokenDecimalsWithFallback(
                          selectedToken && selectedToken.decimals,
                        )}
                        truncate={3}
                      />
                    ),
                    symbol: (selectedToken && selectedToken.symbol) || '???',
                  }}
                />
              </div>
            )}
          </div>
          <Icon
            className={styles.transferIcon}
            name="circle-arrow-back"
            title={MSG.transferIconTitle}
            appearance={{ size: 'medium' }}
          />
          <Select
            options={domainOptions}
            label={MSG.to}
            name="toDomain"
            appearance={{ theme: 'grey' }}
          />
        </div>
      </DialogSection>
      <DialogSection>
        <div className={styles.tokenAmount}>
          <div>
            <Input
              label={MSG.amount}
              name="amount"
              appearance={{
                theme: 'minimal',
                align: 'right',
              }}
              formattingOptions={{
                delimiter: ',',
                numeral: true,
                numeralDecimalScale: getTokenDecimalsWithFallback(
                  selectedToken && selectedToken.decimals,
                ),
              }}
            />
          </div>
          <div className={styles.tokenAmountSelect}>
            <Select
              label={MSG.token}
              options={tokenOptions}
              name="tokenAddress"
              elementOnly
              appearance={{ alignOptions: 'right', theme: 'grey' }}
            />
          </div>
          {values.tokenAddress === AddressZero && (
            <div className={styles.tokenAmountUsd}>
              <EthUsd
                appearance={{ theme: 'grey', size: 'small' }}
                value={
                  /*
                   * @NOTE Set value to 0 if amount is only the decimal point
                   * Just entering the decimal point will pass it through to EthUsd
                   * and that will try to fetch the balance for, which, obviously, will fail
                   */
                  values.amount && values.amount.length && values.amount !== '.'
                    ? values.amount
                    : 0
                }
              />
            </div>
          )}
        </div>
      </DialogSection>
      <DialogSection>
        <div className={styles.textAreaSection}>
          <Textarea
            appearance={{ resizable: 'vertical', colorSchema: 'grey' }}
            label={MSG.reason}
            name="reason"
            maxLength={4000}
          />
        </div>
      </DialogSection>
      <DialogSection appearance={{ align: 'right' }}>
        <Button
          appearance={{ theme: 'secondary', size: 'large' }}
          onClick={cancel}
          text={{ id: 'button.back' }}
        />
        <Button
          appearance={{ theme: 'primary', size: 'large' }}
          onClick={() => handleSubmit()}
          text={{ id: 'button.confirm' }}
          loading={isSubmitting}
          disabled={!isValid}
        />
      </DialogSection>
    </>
  );
};

TransferFundsDialogForm.displayName =
  'dashboard.TransferFundsDialog.TransferFundsDialogForm';

export default TransferFundsDialogForm;