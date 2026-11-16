import { TestBed } from '@angular/core/testing';
import { ApiError } from '@app/core/api/api-error';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { DemoApi } from '@app/core/demo/demo-api';
import { LoginForm, RESEND_COOLDOWN_S } from './login-form';

describe('LoginForm (Signal Forms + AuthField)', () => {
  const setup = async (api?: Partial<WishlistApi>, mode: 'login' | 'reset' = 'login') => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [api ? { provide: WishlistApi, useValue: api } : { provide: WishlistApi, useClass: DemoApi }],
    });
    const fixture = TestBed.createComponent(LoginForm);
    fixture.componentRef.setInput('mode', mode);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el); // so focus() works
    const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
    const type = async (id: string, value: string) => {
      const input = $<HTMLInputElement>(`#${id}`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const submit = async () => {
      $<HTMLButtonElement>('button[type="submit"]').click();
      await fixture.whenStable();
    };
    const msg = (id: string) => $(`#${id}-msg`);
    return { fixture, el, $, type, submit, msg };
  };

  /** A promise we resolve by hand, to look at the form while the request is running. */
  const deferred = () => {
    let resolve!: () => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)));
    return { promise, resolve, reject };
  };

  afterEach(() => vi.useRealTimers());

  it('does not reproach an empty field on blur, only after trying to send', async () => {
    const { fixture, $, submit, msg } = await setup();
    const email = $<HTMLInputElement>('#login-email');
    email.focus();
    email.dispatchEvent(new Event('blur'));
    $<HTMLInputElement>('#login-password').focus();
    await fixture.whenStable();
    expect(msg('login-email').classList.contains('is-error')).toBe(false);
    expect(email.getAttribute('aria-invalid')).toBeNull();

    await submit();

    expect(msg('login-email').textContent?.trim()).toBe('Escribe tu email.');
    expect(msg('login-password').textContent?.trim()).toBe('Escribe tu contraseña.');
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('login-email-msg');
  });

  it('sends an invalid form’s focus to the first field with an error', async () => {
    const { $, type, submit } = await setup();
    await type('login-email', 'mama@demo.test');
    await submit();
    expect(document.activeElement).toBe($('#login-password'));
  });

  it('reserves the message line, so an error does not move the button', async () => {
    const { msg } = await setup();
    // The <p> is always rendered (empty), its min-height lives in the layout's CSS.
    expect(msg('login-email')).not.toBeNull();
    expect(msg('login-password')).not.toBeNull();
  });

  it('signs in with valid credentials', async () => {
    const { fixture, type, submit } = await setup();
    let signedIn = false;
    fixture.componentInstance.signedIn.subscribe(() => (signedIn = true));
    await type('login-email', 'mama@demo.test');
    await type('login-password', 'navidad');
    await submit();
    await new Promise((r) => setTimeout(r, 900)); // the demo backend simulates latency
    await fixture.whenStable();
    expect(signedIn).toBe(true);
  }, 20000);

  it('keeps the button focusable while loading: aria-disabled, never disabled', async () => {
    const call = deferred();
    const signIn = vi.fn(() => call.promise);
    const { fixture, $, type, submit } = await setup({ signIn });
    await type('login-email', 'mama@demo.test');
    await type('login-password', 'navidad');
    const btn = $<HTMLButtonElement>('button[type="submit"]');
    btn.focus();
    await submit();

    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('is-loading')).toBe(true);
    expect(btn.textContent?.trim()).toBe('Entrando…');
    expect(document.activeElement).toBe(btn);

    await submit(); // a second press while loading is ignored
    expect(signIn).toHaveBeenCalledTimes(1);

    call.resolve();
    await fixture.whenStable();
  });

  it('after wrong credentials, focuses and selects the password and clears the alert on edit', async () => {
    const { fixture, el, $, type, submit } = await setup();
    await type('login-email', 'mama@demo.test');
    await type('login-password', 'otra');
    await submit();
    await new Promise((r) => setTimeout(r, 900));
    await fixture.whenStable();

    const pw = $<HTMLInputElement>('#login-password');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('no son correctos');
    expect(document.activeElement).toBe(pw);
    expect(pw.selectionStart).toBe(0);
    expect(pw.selectionEnd).toBe(4);
    expect($('button[type="submit"]').getAttribute('aria-disabled')).toBe('false');

    await type('login-password', 'navida');
    expect(el.querySelector('.al-alert')).toBeNull();
  }, 20000);

  it('names the reveal button after what it shows', async () => {
    const { $ } = await setup();
    expect($('.al-reveal').textContent?.replace(/\s+/g, ' ').trim()).toBe('Mostrar contraseña');
  });

  it('rests the "send link" button for 30 s after sending, with a visible countdown', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const requestPasswordReset = vi.fn(async () => undefined);
    const { fixture, el, $, type, submit } = await setup({ requestPasswordReset }, 'reset');
    await type('reset-email', 'mama@demo.test');
    await submit();
    await fixture.whenStable();

    const btn = $<HTMLButtonElement>('button[type="submit"]');
    expect(requestPasswordReset).toHaveBeenCalledWith('mama@demo.test');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('mama@demo.test');
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.textContent?.trim()).toBe(`Enviar otra vez en ${RESEND_COOLDOWN_S} s`);

    await submit(); // ignored while resting
    expect(requestPasswordReset).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_000);
    await fixture.whenStable();
    expect(btn.textContent?.trim()).toBe('Enviar otra vez en 20 s');

    vi.advanceTimersByTime(20_000);
    await fixture.whenStable();
    expect(btn.getAttribute('aria-disabled')).toBe('false');
    expect(btn.textContent?.trim()).toBe('Enviar otra vez');

    await submit();
    expect(requestPasswordReset).toHaveBeenCalledTimes(2);
  });

  it('does not start the rest when sending fails', async () => {
    const requestPasswordReset = vi.fn(async () => {
      throw new ApiError('NETWORK');
    });
    const { el, $, type, submit, fixture } = await setup({ requestPasswordReset }, 'reset');
    await type('reset-email', 'mama@demo.test');
    await submit();
    await fixture.whenStable();
    expect(el.querySelector('.al-alert')?.textContent).toContain('No hay conexión');
    expect($('button[type="submit"]').getAttribute('aria-disabled')).toBe('false');
  });
});
