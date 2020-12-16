import React, { useCallback } from 'react';

import TokenEditDialog from '~core/TokenEditDialog';
import {
  useSetColonyTokensMutation,
  ColonyTokensDocument,
  ColonyTokensQueryVariables,
  Colony
} from '~data/index';
import { Address } from '~types/index';
import tokensList from './tokenlist.json';

interface Props {
  colony: Colony;
  cancel: () => void;
  close: () => void;
}

const displayName = 'dashboard.ColonyTokenManagementDialog';

const ColonyTokenManagementDialog = ({
  colony,
  cancel,
  close,
}: Props) => {
  const colonyAddress = colony.colonyAddress;

  const [setColonyTokensMutation] = useSetColonyTokensMutation({
    refetchQueries: [
      {
        query: ColonyTokensDocument,
        variables: { address: colonyAddress } as ColonyTokensQueryVariables,
      },
    ],
  });

  const colonyTokens = colony.tokens || [];

  const updateTokens = useCallback(
    (updatedAddresses: Address[]) => {
      return setColonyTokensMutation({
        variables: {
          input: { colonyAddress, tokenAddresses: updatedAddresses },
        },
      });
    },
    [colonyAddress, setColonyTokensMutation],
  );

  return (
    <TokenEditDialog
      cancel={cancel}
      close={close}
      tokens={colonyTokens}
      updateTokens={updateTokens}
      tokensList={
        process.env.NODE_ENV === 'development' ? [] : tokensList.tokens
      }
      nativeTokenAddress={colony.nativeTokenAddress}
    />
  );
};

ColonyTokenManagementDialog.displayName = displayName;

export default ColonyTokenManagementDialog;
