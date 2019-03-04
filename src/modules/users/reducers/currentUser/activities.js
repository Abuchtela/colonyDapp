/* @flow */

import type { List as ListType } from 'immutable';

import { List } from 'immutable';

import { UserActivityRecord } from '~immutable';
import { ACTIONS } from '~redux';

import type { UserActivityRecordType } from '~immutable';
import type { ReducerType } from '~redux';

const currentUserActivitiesReducer: ReducerType<
  ListType<UserActivityRecordType>,
  {|
    // TODO these should use actions based on the current user.
    // Currently, they are not dispatched.
    USER_ACTIVITIES_FETCH_SUCCESS: *,
    USER_ACTIVITIES_UPDATE_SUCCESS: *,
  |},
> = (state = List(), action) => {
  switch (action.type) {
    case ACTIONS.USER_ACTIVITIES_UPDATE_SUCCESS: {
      const { activities } = action.payload;
      return List(activities.map(activity => UserActivityRecord(activity)));
    }
    case ACTIONS.USER_ACTIVITIES_FETCH_SUCCESS: {
      const { activities } = action.payload;
      return List(activities.map(activity => UserActivityRecord(activity)));
    }
    default:
      return state;
  }
};

export default currentUserActivitiesReducer;
