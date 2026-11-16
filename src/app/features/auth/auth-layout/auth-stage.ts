import { Injectable } from '@angular/core';

/** What the envelope on screen can do for the links inside it (see AuthLayout.swap). */
export interface Envelope {
  swap(apply: () => unknown): void;
}

/**
 * Shared, in-memory state between the auth screens (they are separate routes, so separate
 * components): the envelope currently on screen, when the last one was closed to change view (so
 * the next one opens quickly instead of replaying the full arrival), and an email to carry over
 * ("Ya hay una cuenta con este email" → "Entrar con él"). Nothing here is persisted.
 */
@Injectable({ providedIn: 'root' })
export class AuthStage {
  private envelope: Envelope | null = null;
  private email: string | null = null;
  /** Date.now() of the last swap that left a screen (0 = never). */
  handoffAt = 0;

  attach(envelope: Envelope) {
    this.envelope = envelope;
  }
  detach(envelope: Envelope) {
    if (this.envelope === envelope) this.envelope = null;
  }

  /** Runs `apply` (usually a navigation) behind the envelope's close-and-reopen, or at once. */
  go(apply: () => unknown) {
    if (this.envelope) this.envelope.swap(apply);
    else apply();
  }

  /** True right after another auth screen closed its envelope to bring us here. */
  cameFromSwap() {
    return Date.now() - this.handoffAt < 1500;
  }

  rememberEmail(email: string) {
    this.email = email.trim() || null;
  }
  /** The carried-over email, once. */
  takeEmail() {
    const e = this.email;
    this.email = null;
    return e;
  }
}
