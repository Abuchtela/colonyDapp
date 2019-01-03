/* @flow */

import { Map as ImmutableMap } from 'immutable';

import { USER_AVATAR_FETCH_SUCCESS } from '../actionTypes';

import type { Action } from '~types';
import type { UsersProps } from '~immutable';

const userAvatarsReducer = (
  state: $PropertyType<UsersProps, 'avatars'> = new ImmutableMap(),
  action: Action,
) => {
  switch (action.type) {
    case USER_AVATAR_FETCH_SUCCESS: {
      const { hash, avatarData } = action.payload;
      return state.set(hash, avatarData);
    }
    default:
      return state;
  }
};

export default userAvatarsReducer;