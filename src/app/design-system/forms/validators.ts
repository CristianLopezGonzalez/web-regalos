import { SchemaPath, validate } from '@angular/forms/signals';
import { EMAIL_PATTERN } from '@app/core/validation/email';
import { isHttpsUrl } from '@app/core/validation/https-url';

/*
  Reusable Signal Forms rules, called inside a form() schema:
    form(model, (p) => { emailAddress(p.email); httpsUrl(p.purchaseUrl); });
  Both accept an empty value: combine them with required() when the field is mandatory.
*/

/** A complete-looking email (an @ and a dot in the domain). Supabase Auth validates for real. */
export function emailAddress(
  path: SchemaPath<string>,
  message = 'Este email no parece completo (falta la @ o el dominio).',
) {
  validate(path, ({ value }) => {
    const v = value().trim(); // the API trims too, so stray spaces are not an error
    return !v || EMAIL_PATTERN.test(v) ? undefined : { kind: 'email', message };
  });
}

/** A full https:// link (also enforced by a CHECK constraint in the database). */
export function httpsUrl(
  path: SchemaPath<string>,
  message = 'Pega el enlace completo, empezando por https://',
) {
  validate(path, ({ value }) => {
    const v = value().trim();
    return !v || isHttpsUrl(v) ? undefined : { kind: 'https', message };
  });
}
