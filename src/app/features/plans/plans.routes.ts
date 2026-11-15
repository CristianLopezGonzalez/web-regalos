import { Routes } from '@angular/router';

// /plans is guarded by plannerGuard (app.routes.ts); the database (RLS on is_planner) is the real gate.

export const PLANS_ROUTES: Routes = [
  {
    path: '',
    title: 'Nuestros regalos',
    loadComponent: () => import('./plans-page/plans-page').then((m) => m.PlansPage),
  },
  {
    path: ':personId',
    title: 'Nuestros regalos',
    loadComponent: () =>
      import('./plan-person-page/plan-person-page').then((m) => m.PlanPersonPage),
  },
  {
    path: ':personId/new',
    title: 'Nuevo regalo',
    loadComponent: () => import('./plan-gift-edit/plan-gift-edit').then((m) => m.PlanGiftEdit),
  },
  {
    path: ':personId/:giftId',
    title: 'Editar regalo',
    loadComponent: () => import('./plan-gift-edit/plan-gift-edit').then((m) => m.PlanGiftEdit),
  },
];
