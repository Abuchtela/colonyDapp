import { FormikProps } from 'formik';
import React, { useCallback, useState, useMemo } from 'react';
import { defineMessages } from 'react-intl';
import { ROOT_DOMAIN_ID, ColonyRole } from '@colony/colony-js';

import { mergePayload, withKey, mapPayload, pipe } from '~utils/actions';
import { ActionTypes } from '~redux/index';
import { useTransformer } from '~utils/hooks';
import { ItemDataType } from '~core/OmniPicker';
import Heading from '~core/Heading';
import Button from '~core/Button';
import Dialog from '~core/Dialog';
import { ActionForm } from '~core/Fields';
import { SpinnerLoader } from '~core/Preloaders';
import SingleUserPicker, { filterUserSelection } from '~core/SingleUserPicker';
import HookedUserAvatar from '~users/HookedUserAvatar';
import {
  useColonyQuery,
  useLoggedInUser,
  useColonySubscribedUsersQuery,
  useUser,
  AnyUser,
} from '~data/index';

import {
  getUserRolesForDomain,
  getAllRootAccounts,
  getAllUserRolesForDomain,
} from '../../../transformers';
import PermissionManagementForm from './PermissionManagementForm';
import { availableRoles } from './constants';

import styles from './PermissionManagementDialog.css';

const MSG = defineMessages({
  title: {
    id: 'dashboard.PermissionManagementDialog.title',
    defaultMessage: 'Permissions',
  },
  selectUser: {
    id: 'dashboard.PermissionManagementDialog.selectUser',
    defaultMessage: 'Member',
  },
});

interface Props {
  cancel: () => void;
  close: () => void;
  colonyAddress: string;
}

type Member = AnyUser & {
  roles: ColonyRole[];
  directRoles: ColonyRole[];
};

const UserAvatar = HookedUserAvatar({ fetchUser: false });

const supRenderAvatar = (address: string, item: ItemDataType<AnyUser>) => (
  <UserAvatar address={address} user={item} size="xs" notSet={false} />
);

const PermissionManagementDialog = ({
  colonyAddress,
  cancel,
  close,
}: Props) => {
  const { walletAddress: loggedInUserWalletAddress } = useLoggedInUser();

  const loggedInUser = useUser(loggedInUserWalletAddress);

  const [selectedUser, setSelectedUser] = useState<AnyUser>(loggedInUser);

  const [selectedDomainId, setSelectedDomainId] = useState<number>(
    ROOT_DOMAIN_ID,
  );

  const { data: colonySubscribedUsers } = useColonySubscribedUsersQuery({
    variables: {
      colonyAddress,
    },
  });

  const subscribedUsers = colonySubscribedUsers?.colony.subscribedUsers || [];

  const { data: colonyData } = useColonyQuery({
    variables: { address: colonyAddress },
  });

  const currentUserRoles = useTransformer(getUserRolesForDomain, [
    colonyData?.colony,
    // CURRENT USER!
    loggedInUserWalletAddress,
    selectedDomainId,
  ]);

  const userDirectRoles = useTransformer(getUserRolesForDomain, [
    colonyData?.colony,
    // USER TO SET PERMISSIONS FOR!
    selectedUser.profile.walletAddress,
    selectedDomainId,
    true,
  ]);

  const userInheritedRoles = useTransformer(getUserRolesForDomain, [
    colonyData?.colony,
    // USER TO SET PERMISSIONS FOR!
    selectedUser.profile.walletAddress,
    selectedDomainId,
  ]);

  const domainRoles = useTransformer(getAllUserRolesForDomain, [
    colonyData?.colony,
    selectedDomainId,
  ]);

  const directDomainRoles = useTransformer(getAllUserRolesForDomain, [
    colonyData?.colony,
    selectedDomainId,
    true,
  ]);

  const rootAccounts = useTransformer(getAllRootAccounts, [colonyData?.colony]);

  const transform = useCallback(
    pipe(
      withKey(colonyAddress),
      mapPayload((p) => ({
        ...p,
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
    [colonyAddress, selectedDomainId],
  );

  const domainRolesArray = useMemo(
    () =>
      domainRoles
        .sort(({ roles }) => (roles.includes(ColonyRole.Root) ? -1 : 1))
        .filter(({ roles }) => !!roles.length)
        .map(({ address, roles }) => {
          const directUserRoles = directDomainRoles.find(
            ({ address: userAddress }) => userAddress === address,
          );
          return {
            userAddress: address,
            roles,
            directRoles: directUserRoles ? directUserRoles.roles : [],
          };
        }),
    [directDomainRoles, domainRoles],
  );

  const domain =
    colonyData &&
    colonyData.colony.domains.find(
      ({ ethDomainId }) => ethDomainId === selectedDomainId,
    );

  const members: Member[] = subscribedUsers.map((user) => {
    const {
      profile: { walletAddress },
    } = user;
    const domainRole = domainRolesArray.find(
      (rolesObject) => rolesObject.userAddress === walletAddress,
    );
    return {
      ...user,
      roles: domainRole ? domainRole.roles : [],
      directRoles: domainRole ? domainRole.directRoles : [],
    };
  });

  return (
    <Dialog cancel={cancel}>
      {!selectedUser.profile.walletAddress || !colonyData || !domain ? (
        <SpinnerLoader />
      ) : (
        <ActionForm
          enableReinitialize
          initialValues={{
            user: selectedUser,
            domainId: selectedDomainId.toString(),
            roles: userDirectRoles,
          }}
          onSuccess={close}
          submit={ActionTypes.COLONY_DOMAIN_USER_ROLES_SET}
          error={ActionTypes.COLONY_DOMAIN_USER_ROLES_SET_ERROR}
          success={ActionTypes.COLONY_DOMAIN_USER_ROLES_SET_SUCCESS}
          transform={transform}
        >
          {({ isSubmitting }: FormikProps<any>) => (
            <div className={styles.dialogContainer}>
              <Heading
                appearance={{ size: 'medium', margin: 'none', theme: 'dark' }}
                text={MSG.title}
                textValues={{ domain: domain && domain.name }}
              />
              <div className={styles.singleUserContainer}>
                <SingleUserPicker
                  data={members}
                  label={MSG.selectUser}
                  name="user"
                  filter={filterUserSelection}
                  onSelected={setSelectedUser}
                  renderAvatar={supRenderAvatar}
                />
              </div>
              <PermissionManagementForm
                currentUserRoles={currentUserRoles}
                domainId={selectedDomainId}
                rootAccounts={rootAccounts}
                userDirectRoles={userDirectRoles}
                userInheritedRoles={userInheritedRoles}
                colonyDomains={colonyData.colony.domains}
                onDomainSelected={setSelectedDomainId}
              />
              <div className={styles.dialogFooterSection}>
                <Button
                  appearance={{ theme: 'secondary', size: 'large' }}
                  onClick={cancel}
                  text={{ id: 'button.cancel' }}
                />
                <Button
                  appearance={{ theme: 'primary', size: 'large' }}
                  loading={isSubmitting}
                  text={{ id: 'button.confirm' }}
                  type="submit"
                />
              </div>
            </div>
          )}
        </ActionForm>
      )}
    </Dialog>
  );
};

PermissionManagementDialog.displayName =
  'dashboard.Permissions.PermissionManagementDialog';

export default PermissionManagementDialog;