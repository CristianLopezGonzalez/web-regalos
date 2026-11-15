import type { AuthError, PostgrestError } from '@supabase/supabase-js';
import { ApiError, ApiErrorCode } from '../api/api-error';

/** Codes the database functions raise verbatim in their error message (RAISE EXCEPTION '…'). */
const CODES: ApiErrorCode[] = [
  'GIFT_ALREADY_RESERVED',
  'NO_RESERVATION_TO_CANCEL',
  'ONLY_FAMILY_CAN_RESERVE',
  'CANNOT_RESERVE_OWN_GIFT',
  'GIFT_NOT_FOUND',
  'FORBIDDEN',
  'INVITATION_EMAIL_MISMATCH',
  'INVITATION_INVALID',
  // Raised by the plan_gifts check trigger (shares must belong to planners and add up to the price).
  'PLAN_SHARES_MISMATCH',
  'PLAN_SHARES_INVALID',
];

/** Turns Supabase / PostgREST / network errors into the app's error codes. */
export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  const msg = (e as { message?: string } | null)?.message ?? '';
  const code = CODES.find((c) => msg.includes(c));
  if (code) return new ApiError(code);
  if ((e as AuthError)?.name?.startsWith?.('Auth')) {
    const auth = authError(e as AuthError, msg);
    if (auth) return auth;
  }
  if ((e as PostgrestError)?.code === '42501') return new ApiError('FORBIDDEN');
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return new ApiError('NETWORK');
  console.error('[supabase] unexpected error', e);
  return new ApiError('UNKNOWN');
}

function authError(ae: AuthError, msg: string): ApiError | null {
  if (ae.code === 'invalid_credentials' || /invalid login/i.test(msg))
    return new ApiError('INVALID_CREDENTIALS');
  if (ae.code === 'email_not_confirmed' || /not confirmed/i.test(msg))
    return new ApiError('EMAIL_NOT_CONFIRMED');
  if (ae.code === 'user_already_exists' || /already registered/i.test(msg))
    return new ApiError('EMAIL_TAKEN');
  // Any other trigger failure during sign-up: report it as what it is, not as a bad invitation.
  if (/database error saving new user/i.test(msg)) {
    console.error('[sign-up] database error', ae);
    return new ApiError(
      'UNKNOWN',
      'No se pudo crear la cuenta por un error del servidor. Avísame y lo reviso.',
    );
  }
  if (ae.code === 'over_email_send_rate_limit' || ae.status === 429)
    return new ApiError(
      'UNKNOWN',
      'Se han enviado demasiados emails. Espera un rato (hasta una hora) y vuelve a intentarlo.',
    );
  // Supabase's built-in sender only delivers to the project's team members until custom SMTP is set up.
  if (ae.code === 'email_address_not_authorized' || /not authorized/i.test(msg))
    return new ApiError(
      'UNKNOWN',
      'No se pudo enviar el correo: el envío de emails todavía no está configurado.',
    );
  if (/error sending|smtp/i.test(msg))
    return new ApiError('UNKNOWN', 'No se pudo enviar el correo ahora mismo. Inténtalo más tarde.');
  return null;
}

/**
 * Unwraps a Supabase { data, error } result, throwing an ApiError. Typed as non-null because
 * Supabase only returns null data together with an error; `maybeSingle()` callers still null-check.
 */
export function check<D>(r: { data: D; error: unknown }): NonNullable<D> {
  if (r.error) throw toApiError(r.error);
  return r.data as NonNullable<D>;
}
