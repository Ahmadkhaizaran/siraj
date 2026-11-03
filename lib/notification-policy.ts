// Hide earlier alerts without deleting educational or audit records.
export const NOTIFICATIONS_RESET_AT='2026-11-03T11:39:22.000Z';
export function notificationSince(createdAt?:string|null){return new Date(Math.max(Date.parse(NOTIFICATIONS_RESET_AT),Date.parse(createdAt||NOTIFICATIONS_RESET_AT)||0)).toISOString()}
