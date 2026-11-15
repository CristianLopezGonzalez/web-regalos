import { Component, input } from '@angular/core';

interface Flake {
  x: number;
  y0: number;
  r: number;
  dx: number;
  d: number;
  dl: number;
  o: number;
}

/** Deterministic pseudo-random, so the snow is the same on every visit (and in SSR/tests). */
function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
const rnd = seeded(20261224);
const FLAKES: Flake[] = Array.from({ length: 22 }, () => {
  const d = 11000 + rnd() * 9000;
  return {
    x: 66 + rnd() * 268,
    y0: 60 + rnd() * 400,
    r: 1 + rnd() * 1.8,
    dx: (rnd() - 0.5) * 36,
    d,
    dl: -rnd() * d, // already mid-fall on arrival: no empty first seconds
    o: 0.35 + rnd() * 0.45,
  };
});

/**
 * Login / register stage: a night panel with the gold window on one side (desktop),
 * the form on cream on the other. On phones, only the form.
 *
 * The window is the hero's sibling, not a copy: instead of the gift on its plinth, a single
 * ornament is lowered on its thread, then sways while snow falls behind the glass and settles on
 * the sill. Calm on purpose (it sits next to a form): 2.5° of sway over 7 s, slow linear snow.
 */
@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  readonly heading = input.required<string>();
  readonly lede = input<string | null>(null);

  protected readonly flakes = FLAKES;
}
