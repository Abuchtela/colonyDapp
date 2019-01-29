/* @flow */

import type { Node } from 'react';

import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { addLocaleData, IntlProvider } from 'react-intl';
import { BrowserRouter } from 'react-router-dom';
import en from 'react-intl/locale-data/en';
import { Map as ImmutableMap, Record } from 'immutable';

import { CoreTransactions, User, UserProfile, Wallet } from '~immutable';

import '../styles/main.css';

import messages from '../i18n/en.json';

addLocaleData(en);

type Props = {
  children: Node,
};

const MockState = Record({
  admin: undefined,
  core: undefined,
  dashboard: undefined,
  users: undefined,
});

const initialState = MockState({
  admin: {
    transactions: new ImmutableMap(),
    unclaimedTransactions: new ImmutableMap(),
  },
  core: {
    transactions: CoreTransactions(),
  },
  dashboard: {
    allComments: new ImmutableMap(),
    allDomains: new ImmutableMap(),
    allDrafts: new ImmutableMap(),
    allTasks: new ImmutableMap(),
    allColonies: {
      avatars: new ImmutableMap(),
      colonies: new ImmutableMap(),
      ensNames: new ImmutableMap(),
    },
  },
  users: {
    currentUser: User({
      profile: UserProfile({
        username: 'piglet',
      }),
    }),
    wallet: Wallet({
      availableAddresses: [],
      isLoading: false,
    }),
    allUsers: new ImmutableMap(),
  },
});

const configureStore = () => {
  const reducer = (state = initialState) => state;
  return createStore(reducer);
};

const store = configureStore();
// We're injecting ReactIntl into all of our components, even though it might not be needed everywhere
const Wrapper = ({ children }: Props) => (
  <Provider store={store}>
    <IntlProvider locale="en" defaultLocale="en" messages={messages}>
      <BrowserRouter>{children}</BrowserRouter>
    </IntlProvider>
  </Provider>
);

export default Wrapper;
