import { Currency } from '../models/gift';

const formatters = new Map<string, Intl.NumberFormat>();

/** Spanish price: "68 €", "59,90 €" (no decimals for whole amounts). */
export function formatPrice(value: number, currency: Currency) {
  const whole = Number.isInteger(value);
  const key = `${currency}${whole}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    });
    formatters.set(key, fmt);
  }
  return fmt.format(value);
}
