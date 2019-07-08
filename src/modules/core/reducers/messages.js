/* @flow */

import type { CoreMessagesRecord } from '~immutable';
import type { ReducerType } from '~redux';

import { fromJS } from 'immutable';

import { MessageRecord, CoreMessages, TRANSACTION_STATUSES } from '~immutable';
import { ACTIONS } from '~redux';

import { CORE_MESSAGES_LIST } from '../constants';

const coreMessagesReducer: ReducerType<
  CoreMessagesRecord,
  {|
    MESSAGE_CREATED: *,
    MESSAGE_SIGN: *,
    MESSAGE_SIGNED: *,
    MESSAGE_CANCEL: *,
  |},
> = (state = CoreMessages(), action) => {
  switch (action.type) {
    case ACTIONS.MESSAGE_CREATED: {
      const message = MessageRecord(action.payload);
      return state.setIn([CORE_MESSAGES_LIST, message.id], message);
    }
    case ACTIONS.MESSAGE_SIGN: {
      const { id } = action.payload;
      return state.mergeIn(
        [CORE_MESSAGES_LIST, id],
        fromJS({ status: TRANSACTION_STATUSES.PENDING }),
      );
    }
    case ACTIONS.MESSAGE_SIGNED: {
      const { id, signature } = action.payload;
      return state.mergeIn(
        [CORE_MESSAGES_LIST, id],
        fromJS({
          signature,
          status: TRANSACTION_STATUSES.SUCCEEDED,
        }),
      );
    }
    case ACTIONS.MESSAGE_CANCEL: {
      const { id } = action.payload;
      return state.deleteIn([CORE_MESSAGES_LIST, id]);
    }
    default:
      return state;
  }
};

export default coreMessagesReducer;