/* @flow */

type EventTypeId = string;
type EventTypeDictionary = {
  [eventType: EventTypeId]: string,
};

export const TASK_EVENT_TYPES: EventTypeDictionary = Object.freeze({
  COMMENT_STORE_CREATED: 'COMMENT_STORE_CREATED',
  DRAFT_CREATED: 'DRAFT_CREATED',
  DRAFT_UPDATED: 'DRAFT_UPDATED',
  DUE_DATE_SET: 'DUE_DATE_SET',
  SKILL_SET: 'SKILL_SET',
});

export const USER_EVENT_TYPES: EventTypeDictionary = Object.freeze({
  // @TODO: Add inbox event types
  READ_UNTIL: 'READ_UNTIL',
});

export const COLONY_EVENT_TYPES: EventTypeDictionary = Object.freeze({
  ADMIN_ADDED: 'ADMIN_ADDED',
  ADMIN_REMOVED: 'ADMIN_REMOVED',
  AVATAR_UPLOADED: 'AVATAR_UPLOADED',
  AVATAR_REMOVED: 'AVATAR_REMOVED',
  DOMAIN_CREATED: 'DOMAIN_CREATED',
  PROFILE_CREATED: 'PROFILE_CREATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  TASK_STORE_CREATED: 'TASK_STORE_CREATED',
  TOKEN_INFO_ADDED: 'TOKEN_INFO_ADDED',
});
