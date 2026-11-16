import {
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { AuthStage, Envelope } from './auth-stage';

/** open: the flap is (or is about to be) open · closed: waiting · void: dead invitation/link ·
 *  stamped: closed and sealed again (account created, check your email). */
export type EnvelopeState = 'open' | 'closed' | 'void' | 'stamped';

interface Flake {
  x: number;
  y: number;
  s: number;
  o: number;
  d: number;
  dl: number;
  dx: number;
}

/** Deterministic pseudo-random, so the snow is the same on every visit (and in tests). */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const rnd = seeded(1224);
const FLAKES: Flake[] = Array.from({ length: 16 }, () => {
  const d = 14000 + rnd() * 10000;
  return {
    x: rnd() * 100,
    y: rnd() * 100,
    s: 2 + rnd() * 2.5,
    o: 0.25 + rnd() * 0.4,
    d,
    dl: -rnd() * d, // already mid-fall on arrival
    dx: (rnd() - 0.5) * 60,
  };
});

const CLOSE_MS = 330; // the flap closes in 320 ms; the view changes once it is down
const REOPEN_MS = 220; // pause with the envelope shut before it opens again

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () =>
  typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * «La invitación lacrada». The whole page is the shop window at night (the Home's arch drawn in
 * gold thread behind, slow snow) and the form is an ivory letter in an envelope: on arrival the
 * wax seal splits (460 ms) and the burgundy flap turns open (640 ms, ease-premium). Changing view
 * closes the envelope (320 ms) and opens it again.
 *
 * The flap only covers the letter's top margin: it never hides a field or the button, and nothing
 * waits for it — the fields can be used while it opens. With reduced motion: final state at once.
 *
 * ViewEncapsulation.None so the auth screens projected into the letter share one stylesheet;
 * every selector is scoped under `.al`.
 */
@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
  encapsulation: ViewEncapsulation.None,
})
export class AuthLayout implements Envelope {
  private readonly stage = inject(AuthStage);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly eyebrow = input<string | null>(null);
  readonly heading = input.required<string>();
  readonly lede = input<string | null>(null);
  /** Letter on the wax seal. Neutral "W" until the invitation can tell who sends it. */
  readonly monogram = input('W');
  readonly state = input<EnvelopeState>('open');
  /** How long the envelope stays shut on a fresh visit before it opens (ms). */
  readonly arrival = input(380);

  protected readonly flakes = FLAKES;
  protected readonly opened = signal(false);
  protected readonly leaving = signal(false);
  protected readonly entering = signal(false);
  protected readonly voided = computed(() => this.state() === 'void');
  protected readonly stamped = computed(() => this.state() === 'stamped');

  private readonly bornAt = Date.now();
  private readonly fromSwap = this.stage.cameFromSwap();
  private swapping = false;
  private destroyed = false;
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    this.stage.attach(this);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clear();
      this.stage.detach(this);
    });

    // Follow the state the page asks for (unless a swap is choreographing it).
    effect(() => {
      const s = this.state();
      untracked(() => {
        if (this.swapping) return;
        if (s === 'open') {
          if (!this.opened()) this.openIn(this.arrivalLeft());
        } else {
          this.clear();
          this.opened.set(false);
        }
      });
    });
  }

  /** Close → change the view (apply) → open again. `apply` may navigate away (then we stop). */
  swap(apply: () => unknown) {
    this.clear();
    if (reducedMotion()) {
      this.stage.handoffAt = Date.now();
      void apply();
      return;
    }
    this.swapping = true;
    this.leaving.set(true);
    this.opened.set(false);
    this.later(async () => {
      this.stage.handoffAt = Date.now();
      try {
        await apply();
      } finally {
        this.swapping = false;
        if (!this.destroyed) {
          this.leaving.set(false);
          this.entering.set(true);
          this.later(() => this.entering.set(false), 560);
          if (this.state() === 'open') this.openIn(REOPEN_MS);
        }
      }
    }, CLOSE_MS);
  }

  /**
   * Move focus into the letter after a view change: with a mouse, to the first field (ready to
   * type); on touch, to the title (so the keyboard does not pop up and screen readers announce it).
   * On a fresh visit with touch, focus is left alone. Call it once the new view has rendered.
   */
  focusView(opts: { firstVisit?: boolean } = {}) {
    const root = this.host.nativeElement;
    const field = root.querySelector<HTMLElement>('.al-letter .input:not([readonly])');
    const title = root.querySelector<HTMLElement>('.al-title');
    if (finePointer() && field) field.focus({ preventScroll: opts.firstVisit });
    else if (!opts.firstVisit || this.fromSwap) title?.focus({ preventScroll: true });
  }

  private arrivalLeft() {
    const wait = this.fromSwap ? REOPEN_MS : this.arrival();
    return Math.max(0, wait - (Date.now() - this.bornAt));
  }

  private openIn(ms: number) {
    if (reducedMotion() || ms <= 0) return this.opened.set(true);
    this.later(() => this.opened.set(true), ms);
  }

  private later(fn: () => void, ms: number) {
    this.timers.push(setTimeout(fn, ms));
  }
  private clear() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }
}
