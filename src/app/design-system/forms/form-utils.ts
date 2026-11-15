import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isHttpsUrl } from '../../core/format';

/** Message for the first error of a control, once it was touched or the form was submitted. */
export function errorFor(c: AbstractControl, submitted: boolean, messages: Record<string, string>): string | null {
  if (!c.errors || !(c.touched || submitted)) return null;
  const key = Object.keys(c.errors)[0];
  return messages[key] ?? 'Revisa este campo.';
}

export const httpsUrl: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = (c.value ?? '').toString().trim();
  return !v || isHttpsUrl(v) ? null : { https: true };
};

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
