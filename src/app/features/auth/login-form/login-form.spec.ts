import { TestBed } from '@angular/core/testing';
import { WishlistApi } from '@app/core/api/wishlist-api';
import { DemoApi } from '@app/core/demo/demo-api';
import { LoginForm } from './login-form';

describe('LoginForm (Signal Forms + LabeledField)', () => {
  const setup = async () => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: WishlistApi, useClass: DemoApi }] });
    const fixture = TestBed.createComponent(LoginForm);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    const type = async (id: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const submit = async () => {
      el.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await fixture.whenStable();
    };
    return { fixture, el, type, submit };
  };

  it('shows each field’s message and marks it invalid only after submitting', async () => {
    const { el, submit } = await setup();
    const email = el.querySelector('#login-email')!;
    expect(el.querySelector('.field-error')).toBeNull();
    expect(email.getAttribute('aria-invalid')).toBeNull();

    await submit();

    const errors = [...el.querySelectorAll('.field-error')].map((p) => p.textContent?.trim());
    expect(errors).toEqual(['Escribe tu email.', 'Escribe tu contraseña.']);
    expect(email.getAttribute('aria-invalid')).toBe('true');
    expect(email.getAttribute('aria-describedby')).toBe('login-email-msg');
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

  it('reports wrong credentials in the form alert', async () => {
    const { fixture, el, type, submit } = await setup();
    await type('login-email', 'mama@demo.test');
    await type('login-password', 'otra');
    await submit();
    await new Promise((r) => setTimeout(r, 900));
    await fixture.whenStable();
    expect(el.querySelector('.form-alert')?.textContent).toContain('no son correctos');
  }, 20000);
});
