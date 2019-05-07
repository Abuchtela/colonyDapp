/* @flow */

import type { Action } from '~redux';

import { ACTIONS } from '~redux';

/* eslint-disable-next-line import/prefer-default-export */
export const fetchNetwork = (): Action<typeof ACTIONS.NETWORK_FETCH> => ({
  type: ACTIONS.NETWORK_FETCH,
});