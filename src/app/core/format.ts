import { ApiError, Currency } from './models';

const money = new Map<string, Intl.NumberFormat>();
export function formatPrice(value: number, currency: Currency) {
  const whole = Number.isInteger(value);
  const key = `${currency}${whole}`;
  if (!money.has(key)) {
    money.set(
      key,
      new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency,
        minimumFractionDigits: whole ? 0 : 2,
        maximumFractionDigits: 2,
      }),
    );
  }
  return money.get(key)!.format(value);
}

const dateFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatShortDate = (iso: string) => shortFmt.format(new Date(iso));

/** One sentence: what happened and, where possible, what to do. */
export function errorMessage(e: unknown): string {
  const code = e instanceof ApiError ? e.code : 'UNKNOWN';
  switch (code) {
    case 'GIFT_ALREADY_RESERVED':
      return 'Alguien acaba de reservar este regalo. Elige otro de la lista.';
    case 'NO_RESERVATION_TO_CANCEL':
      return 'No tienes ninguna reserva de este regalo que cancelar.';
    case 'ONLY_FAMILY_CAN_RESERVE':
      return 'Solo la familia puede reservar regalos.';
    case 'CANNOT_RESERVE_OWN_GIFT':
      return 'Es uno de tus deseos: no puedes reservártelo a ti.';
    case 'GIFT_NOT_FOUND':
      return 'Este regalo ya no está en la lista.';
    case 'FORBIDDEN':
      return 'No tienes permiso para hacer esto.';
    case 'INVALID_CREDENTIALS':
      return 'El email o la contraseña no son correctos.';
    case 'EMAIL_NOT_CONFIRMED':
      return 'Confirma tu email con el enlace que te hemos enviado y vuelve a entrar.';
    case 'EMAIL_TAKEN':
      return 'Ya existe una cuenta con este email. Entra con tu contraseña.';
    case 'INVITATION_INVALID':
      return 'Esta invitación no es válida: puede que haya caducado o que ya se haya usado. Pide un enlace nuevo.';
    case 'INVITATION_EMAIL_MISMATCH':
      return 'Esta invitación es para otro email. Usa el email al que te la enviaron.';
    case 'CATEGORY_NOT_EMPTY':
      return 'Esta categoría tiene regalos. Muévelos a otra antes de borrarla.';
    case 'NETWORK':
      return 'No hay conexión. Comprueba tu red e inténtalo otra vez.';
    default:
      return e instanceof ApiError && e.message !== e.code ? e.message : 'Algo ha fallado. Inténtalo otra vez.';
  }
}

/** Only https links are stored (also enforced by a CHECK constraint in the database). */
export function isHttpsUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !!u.hostname && value.length <= 2048;
  } catch {
    return false;
  }
}
