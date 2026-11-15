import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { emailAddress, httpsUrl } from './validators';

const build = () =>
  TestBed.runInInjectionContext(() =>
    form(signal({ email: '', url: '' }), (p) => {
      emailAddress(p.email);
      httpsUrl(p.url);
    }),
  );

describe('form validators', () => {
  it('accept empty values (optional fields)', () => {
    const f = build();
    expect(f().valid()).toBe(true);
  });

  it('emailAddress wants an @ and a domain, ignoring stray spaces', () => {
    const f = build();
    f.email().value.set('tia@ejemplo');
    expect(f.email().errors()[0]?.kind).toBe('email');
    f.email().value.set('  tia@ejemplo.com ');
    expect(f.email().valid()).toBe(true);
  });

  it('httpsUrl only accepts full https links', () => {
    const f = build();
    f.url().value.set('tienda.com/vela');
    expect(f.url().errors()[0]?.message).toContain('https://');
    f.url().value.set('http://tienda.com');
    expect(f.url().valid()).toBe(false);
    f.url().value.set('https://tienda.com/vela');
    expect(f.url().valid()).toBe(true);
  });
});
