import React from 'react';
import { defineMessages, FormattedMessage } from 'react-intl';
import { Extension } from '@colony/colony-js';

import { DialogProps, ActionDialogProps } from '~core/Dialog';
import IndexModal from '~core/IndexModal';

import { WizardDialogType, useTransformer } from '~utils/hooks';
import { useLoggedInUser, Colony, useColonyExtensionsQuery } from '~data/index';
import { getAllUserRoles } from '../../../transformers';
import { canAdminister, canFund } from '../../../users/checks';

const MSG = defineMessages({
  dialogHeader: {
    id: 'dashboard.ExpendituresDialog.dialogHeader',
    defaultMessage: 'Create Expenditure',
  },
  paymentTitle: {
    id: 'dashboard.ExpendituresDialog.paymentTitle',
    defaultMessage: 'Payment',
  },
  paymentDescription: {
    id: 'dashboard.ExpendituresDialog.paymentDescription',
    defaultMessage: 'A quick and simple payment for something already done.',
  },
  paymentPermissionsText: {
    id: 'dashboard.ExpendituresDialog.paymentPermissionsText',
    defaultMessage: `You must have the {permissionsList} permissions in the
      relevant teams, in order to take this action`,
  },
  noOneTxExtension: {
    id: 'dashboard.ExpendituresDialog.noOneTxExtension',
    defaultMessage: `The OneTxPayment extension is not installed in this colony.
    Please use the Extensions Manager to install it if you want to make a new
    payment.`,
  },
  paymentPermissionsList: {
    id: 'dashboard.ExpendituresDialog.paymentPermissionsList',
    defaultMessage: 'administration and funding',
  },
  taskTitle: {
    id: 'dashboard.ExpendituresDialog.taskTitle',
    defaultMessage: 'Task',
  },
  taskDescription: {
    id: 'dashboard.ExpendituresDialog.taskDescription',
    defaultMessage: 'Commission some work and who will manage its delivery.',
  },
  recurringTitle: {
    id: 'dashboard.ExpendituresDialog.recurringTitle',
    defaultMessage: 'Task',
  },
  recurringDescription: {
    id: 'dashboard.ExpendituresDialog.recurringDescription',
    defaultMessage: 'For regular payments like salaries.',
  },
});

interface CustomWizardDialogProps extends ActionDialogProps {
  nextStep: string;
  prevStep: string;
  colony: Colony;
}

type Props = DialogProps & WizardDialogType<object> & CustomWizardDialogProps;

const displayName = 'dashboard.ExpendituresDialog';

const ExpendituresDialog = ({
  cancel,
  close,
  callStep,
  prevStep,
  colony: { colonyAddress },
  colony,
  isVotingExtensionEnabled,
  nextStep,
}: Props) => {
  const { walletAddress, username, ethereal } = useLoggedInUser();

  const allUserRoles = useTransformer(getAllUserRoles, [colony, walletAddress]);

  const hasRegisteredProfile = !!username && !ethereal;
  const canCreatePayment =
    hasRegisteredProfile &&
    canAdminister(allUserRoles) &&
    canFund(allUserRoles);

  const { data: colonyExtensionsData } = useColonyExtensionsQuery({
    variables: { address: colonyAddress },
  });

  const canMakePayment =
    (colonyExtensionsData?.processedColony?.installedExtensions?.find(
      ({ extensionId }) => extensionId === Extension.OneTxPayment,
    ) &&
      isVotingExtensionEnabled) ||
    false;

  const items = [
    {
      title: MSG.paymentTitle,
      description: MSG.paymentDescription,
      icon: 'emoji-dollar-stack',
      permissionRequired: !canCreatePayment || !canMakePayment,
      permissionInfoText: !canCreatePayment
        ? MSG.paymentPermissionsText
        : MSG.noOneTxExtension,
      permissionInfoTextValues: {
        permissionsList: <FormattedMessage {...MSG.paymentPermissionsList} />,
      },
      onClick: () => callStep(nextStep),
    },
    {
      title: MSG.taskTitle,
      description: MSG.taskDescription,
      icon: 'emoji-superman',
      comingSoon: true,
    },
    {
      title: MSG.recurringTitle,
      description: MSG.recurringDescription,
      icon: 'emoji-calendar',
      comingSoon: true,
    },
  ];
  return (
    <IndexModal
      cancel={cancel}
      close={close}
      title={MSG.dialogHeader}
      items={items}
      back={() => callStep(prevStep)}
    />
  );
};

ExpendituresDialog.displayName = displayName;

export default ExpendituresDialog;
