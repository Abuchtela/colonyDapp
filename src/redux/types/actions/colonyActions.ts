import { BigNumber } from 'ethers/utils';

import { ActionTypes } from '~redux/index';
import { Address } from '~types/index';

import {
  ErrorActionType,
  UniqueActionType,
  ActionTypeWithMeta,
  MetaWithHistory,
} from './index';

/*
 * @NOTE About naming
 * I couldn't come up with anything better, as we already have ColonyActionTypes :(
 */
export type ColonyActionsActionTypes =
  | UniqueActionType<
      ActionTypes.COLONY_ACTION_EXPENDITURE_PAYMENT,
      {
        colonyAddress: Address;
        colonyName?: string;
        recipientAddress: Address;
        domainId: number;
        singlePayment: {
          amount: BigNumber;
          tokenAddress: Address;
          decimals: number;
        };
      },
      MetaWithHistory<object>
    >
  | ErrorActionType<ActionTypes.COLONY_ACTION_EXPENDITURE_PAYMENT_ERROR, object>
  | ActionTypeWithMeta<
      ActionTypes.COLONY_ACTION_EXPENDITURE_PAYMENT_SUCCESS,
      MetaWithHistory<object>
    >;