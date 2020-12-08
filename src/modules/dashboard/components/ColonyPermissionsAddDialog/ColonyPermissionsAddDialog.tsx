import { FormikProps } from 'formik';
import { useQuery } from '@apollo/client';
import React, { useCallback, useState } from 'react';
import { defineMessages } from 'react-intl';
import { ROOT_DOMAIN_ID } from '@colony/colony-js';

import { Address } from '~types/index';
import { mergePayload, withKey, mapPayload, pipe } from '~utils/actions';
import { ItemDataType } from '~core/OmniPicker';
import { ActionTypes } from '~redux/index';
import { useTransformer } from '~utils/hooks';
import {
  ColonySubscribedUsersDocument,
  AnyUser,
  useColonyQuery,
  useLoggedInUser,
  useUserLazy,
} from '~data/index';
import SingleUserPicker, { filterUserSelection } from '~core/SingleUserPicker';
import { SpinnerLoader } from '~core/Preloaders';
import Heading from '~core/Heading';
import Button from '~core/Button';
import Dialog, { DialogSection } from '~core/Dialog';
import { ActionForm, InputLabel } from '~core/Fields';
import {
  PermissionManagementForm,
  availableRoles,
} from '~dashboard/PermissionManagementDialog';
import HookedUserAvatar from '~users/HookedUserAvatar';

import {
  getAllRootAccounts,
  getUserRolesForDomain,
} from '../../../transformers';

import styles from '../PermissionManagementDialog/PermissionManagementDialog.css';

const MSG = defineMessages({
  errorNoUserGiven: {
    id: 'admin.ColonyPermissionsAddDialog.errorNoUserGiven',
    defaultMessage: 'No user selected',
  },
  title: {
    id: 'admin.ColonyPermissionsAddDialog.title',
    defaultMessage: 'Add New Role in {domain}',
  },
  selectUser: {
    id: 'admin.ColonyPermissionsAddDialog.selectUser',
    defaultMessage: 'Select Member',
  },
  search: {
    id: 'admin.ColonyPermissionsAssDialog.search',
    defaultMessage: 'Search for a user or paste a wallet address',
  },
});

interface Props {
  cancel: () => void;
  close: () => void;
  domainId: number;
  colonyAddress: Address;
}

const UserAvatar = HookedUserAvatar({ fetchUser: false });

const supRenderAvatar = (address: string, item: ItemDataType<AnyUser>) => (
  <UserAvatar address={address} user={item} size="xs" notSet={false} />
);

const ColonyPermissionsAddDialog = ({
  colonyAddress,
  cancel,
  close,
  domainId,
}: Props) => {
  const { walletAddress } = useLoggedInUser();
  const [selectedUserAddress, setSelectedUserAddress] = useState<string>();
  const [selectedDomainId, setSelectedDomainId] = useState<number>(
    ROOT_DOMAIN_ID,
  );

  const { data: colonyData } = useColonyQuery({
    variables: { address: colonyAddress },
  });

  const currentUserRoles = useTransformer(getUserRolesForDomain, [
    colonyData && colonyData.colony,
    // CURRENT USER!
    walletAddress,
    domainId,
  ]);

  const userDirectRoles = useTransformer(getUserRolesForDomain, [
    colonyData && colonyData.colony,
    // USER TO SET PERMISSIONS FOR!
    selectedUserAddress,
    domainId,
    true,
  ]);

  const userInheritedRoles = useTransformer(getUserRolesForDomain, [
    colonyData && colonyData.colony,
    // USER TO SET PERMISSIONS FOR!
    selectedUserAddress,
    domainId,
  ]);

  const rootAccounts = useTransformer(getAllRootAccounts, [
    colonyData && colonyData.colony,
  ]);

  const updateSelectedUser = useCallback(
    (user: AnyUser) => {
      setSelectedUserAddress(user.profile.walletAddress);
    },
    [setSelectedUserAddress],
  );

  const transform = useCallback(
    pipe(
      withKey(colonyAddress),
      mapPayload((p) => ({
        userAddress: p.user.profile.walletAddress,
        domainId,
        colonyAddress,
        roles: availableRoles.reduce(
          (acc, role) => ({
            ...acc,
            [role]: p.roles.includes(role),
          }),
          {},
        ),
      })),
      mergePayload({ colonyAddress }),
    ),
    [colonyAddress, domainId],
  );

  const { data: subscribedUsersData } = useQuery(
    ColonySubscribedUsersDocument,
    {
      variables: { colonyAddress },
    },
  );

  const user = useUserLazy(selectedUserAddress);
  const domain =
    colonyData &&
    colonyData.colony.domains.find(
      ({ ethDomainId }) => ethDomainId === domainId,
    );

  return (
    <Dialog cancel={cancel}>
      {!colonyData ||
      !domain ||
      !subscribedUsersData ||
      !subscribedUsersData.colony.subscribedUsers ? (
        <SpinnerLoader />
      ) : (
        <ActionForm
          enableReinitialize
          initialValues={{
            domainId: selectedDomainId.toString(),
            roles: userInheritedRoles,
            user,
          }}
          onSuccess={close}
          submit={ActionTypes.COLONY_DOMAIN_USER_ROLES_SET}
          error={ActionTypes.COLONY_DOMAIN_USER_ROLES_SET_ERROR}
          success={ActionTypes.COLONY_DOMAIN_USER_ROLES_SET_SUCCESS}
          transform={transform}
        >
          {({ isSubmitting }: FormikProps<any>) => {
            return (
              <div className={styles.dialogContainer}>
                <Heading
                  appearance={{ size: 'medium', margin: 'none' }}
                  text={MSG.title}
                  textValues={{ domain: domain && domain.name }}
                />
                <div>
                  <InputLabel label={MSG.selectUser} />
                  <SingleUserPicker
                    appearance={{ width: 'wide' }}
                    data={subscribedUsersData.colony.subscribedUsers}
                    label={MSG.search}
                    elementOnly
                    name="user"
                    placeholder={MSG.search}
                    filter={filterUserSelection}
                    onSelected={updateSelectedUser}
                    renderAvatar={supRenderAvatar}
                  />
                </div>
                <PermissionManagementForm
                  currentUserRoles={currentUserRoles}
                  domainId={domainId}
                  rootAccounts={rootAccounts}
                  userDirectRoles={userDirectRoles}
                  userInheritedRoles={userInheritedRoles}
                  colonyDomains={colonyData.colony.domains}
                  onDomainSelected={setSelectedDomainId}
                />
                <DialogSection appearance={{ align: 'right' }}>
                  <Button
                    appearance={{ theme: 'secondary', size: 'large' }}
                    onClick={cancel}
                    text={{ id: 'button.cancel' }}
                  />
                  <Button
                    appearance={{ theme: 'primary', size: 'large' }}
                    loading={isSubmitting}
                    text={{ id: 'button.confirm' }}
                    disabled={!selectedUserAddress}
                    type="submit"
                  />
                </DialogSection>
              </div>
            );
          }}
        </ActionForm>
      )}
    </Dialog>
  );
};

ColonyPermissionsAddDialog.displayName =
  'admin.Permissions.ColonyPermissionsAddDialog';

export default ColonyPermissionsAddDialog;