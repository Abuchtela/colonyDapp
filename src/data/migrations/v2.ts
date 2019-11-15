import { EventTypes, Versions } from '~data/constants';
import { ROOT_DOMAIN } from '../../modules/core/constants';
import { EventMigrationFunction } from './types';

const taskCreated: EventMigrationFunction<
  EventTypes.TASK_CREATED,
  Versions.V2
> = ({ payload, meta, ...event }) => ({
  ...event,
  payload: {
    ...payload,
    domainId: ROOT_DOMAIN,
  },
  meta: {
    ...meta,
    version: Versions.V2,
  },
});

export const V2Migrations: [
  Versions.V2,
  Record<string, EventMigrationFunction<any, Versions.V2>>,
] = [
  Versions.V2,
  {
    [EventTypes.TASK_CREATED]: taskCreated,
  },
];