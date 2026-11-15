/** Error codes raised by the database functions (docs/DATABASE.md §4) plus auth ones. */
export type ApiErrorCode =
  | 'GIFT_ALREADY_RESERVED'
  | 'NO_RESERVATION_TO_CANCEL'
  | 'ONLY_FAMILY_CAN_RESERVE'
  | 'CANNOT_RESERVE_OWN_GIFT'
  | 'GIFT_NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'EMAIL_TAKEN'
  | 'INVITATION_INVALID'
  | 'INVITATION_EMAIL_MISMATCH'
  | 'CATEGORY_NOT_EMPTY'
  | 'PLAN_SHARES_MISMATCH'
  | 'PLAN_SHARES_INVALID'
  | 'NETWORK'
  | 'UNKNOWN';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}
