import { Routes } from '@angular/router';
import { ownerGuard } from '@app/core/auth/auth-guards';

// /admin is open to everyone with a list of their own (listGuard); these three stay the owner's.

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    title: 'Resumen',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'gifts',
    title: 'Regalos',
    loadComponent: () => import('./gifts-admin/gifts-admin').then((m) => m.GiftsAdmin),
  },
  {
    path: 'gifts/new',
    title: 'Nuevo regalo',
    loadComponent: () => import('./gift-edit/gift-edit').then((m) => m.GiftEdit),
  },
  {
    path: 'gifts/:id',
    title: 'Editar regalo',
    loadComponent: () => import('./gift-edit/gift-edit').then((m) => m.GiftEdit),
  },
  {
    path: 'categories',
    canMatch: [ownerGuard],
    title: 'Categorías',
    loadComponent: () =>
      import('./categories-admin/categories-admin').then((m) => m.CategoriesAdmin),
  },
  {
    path: 'invitations',
    canMatch: [ownerGuard],
    title: 'Invitaciones',
    loadComponent: () =>
      import('./invitations-admin/invitations-admin').then((m) => m.InvitationsAdmin),
  },
  {
    path: 'family',
    canMatch: [ownerGuard],
    title: 'Familia',
    loadComponent: () => import('./family-admin/family-admin').then((m) => m.FamilyAdmin),
  },
];
