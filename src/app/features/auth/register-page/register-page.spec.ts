import { passwordShortBy } from '../register-form/register-form';
import { inviteTokenFrom } from './register-page';

describe('inviteTokenFrom (pasting an invitation link)', () => {
  it('takes the token from a full link, with or without other parameters', () => {
    expect(inviteTokenFrom('https://web-regalos.vercel.app/register?invite=abcDEF-12345')).toBe(
      'abcDEF-12345',
    );
    expect(inviteTokenFrom('  /register?x=1&invite=demo-invitacion-navidad#top ')).toBe(
      'demo-invitacion-navidad',
    );
  });

  it('accepts a bare token and rejects anything else', () => {
    expect(inviteTokenFrom('demo-invitacion-navidad')).toBe('demo-invitacion-navidad');
    expect(inviteTokenFrom('')).toBeNull();
    expect(inviteTokenFrom('hola')).toBeNull();
    expect(inviteTokenFrom('https://example.com/register')).toBeNull();
  });
});

describe('passwordShortBy', () => {
  it('counts down to 8 characters', () => {
    expect(passwordShortBy(3)).toBe('Le faltan 5 caracteres para llegar a 8.');
    expect(passwordShortBy(7)).toBe('Le falta 1 carácter para llegar a 8.');
  });
});
