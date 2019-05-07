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
    USER_ACTIVITIES_FETCH_SUCCESS: *,
    USER_ACTIVITIES_ADD_SUCCESS: *,
  |},
> = (state = List(), action) => {
  switch (action.type) {
    case ACTIONS.USER_ACTIVITIES_ADD_SUCCESS: {
      const { activity } = action.payload;
      return state.push(UserActivityRecord(activity));
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