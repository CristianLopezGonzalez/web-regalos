import { ApiError, ApiErrorCode } from './api-error';

const MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  GIFT_ALREADY_RESERVED: 'Alguien acaba de reservar este regalo. Elige otro de la lista.',
  NO_RESERVATION_TO_CANCEL: 'No tienes ninguna reserva de este regalo que cancelar.',
  ONLY_FAMILY_CAN_RESERVE: 'Solo la familia puede reservar regalos.',
  CANNOT_RESERVE_OWN_GIFT: 'Es uno de tus deseos: no puedes reservártelo a ti.',
  GIFT_NOT_FOUND: 'Este regalo ya no está en la lista.',
  FORBIDDEN: 'No tienes permiso para hacer esto.',
  INVALID_CREDENTIALS: 'El email o la contraseña no son correctos.',
  EMAIL_NOT_CONFIRMED: 'Confirma tu email con el enlace que te hemos enviado y vuelve a entrar.',
  EMAIL_TAKEN: 'Ya existe una cuenta con este email. Entra con tu contraseña.',
  INVITATION_INVALID:
    'Esta invitación no es válida: puede que haya caducado o que ya se haya usado. Pide un enlace nuevo.',
  INVITATION_EMAIL_MISMATCH:
    'Esta invitación es para otro email. Usa el email al que te la enviaron.',
  PLAN_SHARES_MISMATCH: 'Lo que pone cada uno tiene que sumar el precio del regalo.',
  PLAN_SHARES_INVALID: 'El reparto no es válido: revisa las cantidades.',
  CATEGORY_NOT_EMPTY: 'Esta categoría tiene regalos. Muévelos a otra antes de borrarla.',
  NETWORK: 'No hay conexión. Comprueba tu red e inténtalo otra vez.',
};

/** One sentence: what happened and, where possible, what to do. */
export function errorMessage(e: unknown): string {
  const code = e instanceof ApiError ? e.code : 'UNKNOWN';
  return (
    MESSAGES[code] ??
    (e instanceof ApiError && e.message !== e.code
      ? e.message
      : 'Algo ha fallado. Inténtalo otra vez.')
  );
}
