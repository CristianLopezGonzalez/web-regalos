import { Routes } from '@angular/router';

// /plans is guarded by plannerGuard (app.routes.ts); the database (RLS on is_planner) is the real gate.

/** Old per-person and per-gift pages: everything now lives on the board, filtered by person. */
const toBoard = ({ params }: { params: Record<string, string> }) =>
  `/plans?persona=${encodeURIComponent(params['personId'] ?? '')}`;

export const PLANS_ROUTES: Routes = [
  {
    path: '',
    title: 'Nuestros regalos',
    loadComponent: () => import('./plans-page/plans-page').then((m) => m.PlansPage),
  },
  { path: ':personId', redirectTo: toBoard },
  { path: ':personId/new', redirectTo: toBoard },
  { path: ':personId/:giftId', redirectTo: toBoard },
];
