/* @flow */

import type { RecordFactory, RecordOf } from 'immutable';

import { Record } from 'immutable';

type Shared = {|
  id?: string,
  comment?: string,
  task?: string,
  userAddress?: string,
  event: string,
  timestamp: Date,
  colonyName?: string,
|};

export type UserActivityType = $ReadOnly<Shared>;

export type UserActivityRecordType = RecordOf<Shared>;

const defaultValues: $Shape<Shared> = {
  id: undefined,
  comment: undefined,
  task: undefined,
  userAddress: undefined,
  event: undefined,
  timestamp: new Date(),
  colonyName: undefined,
};

const UserActivityRecord: RecordFactory<Shared> = Record(defaultValues);

export default UserActivityRecord;
