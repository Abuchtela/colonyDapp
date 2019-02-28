/* @flow */

import { Map as ImmutableMap, List } from 'immutable';

import type { ReducerType } from '~redux';
import type { AllCommentsMap } from '~immutable';

import { TaskCommentRecord } from '~immutable';
import { ACTIONS } from '~redux';

const allCommentsReducer: ReducerType<
  AllCommentsMap,
  {|
    TASK_COMMENT_ADD_SUCCESS: *,
  |},
> = (state = new ImmutableMap(), action) => {
  switch (action.type) {
    case ACTIONS.TASK_COMMENT_ADD_SUCCESS: {
      const {
        payload: { taskId, commentData, signature },
        meta: { id },
      } = action;
      const comment = TaskCommentRecord({
        content: { ...commentData, id },
        signature,
      });
      return state.has(taskId)
        ? state.updateIn([taskId], list => list.push(comment))
        : state.set(taskId, List.of(comment));
    }
    default:
      return state;
  }
};

export default allCommentsReducer;
