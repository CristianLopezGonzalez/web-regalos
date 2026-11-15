import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', title: 'Resumen', loadComponent: () => import('./dashboard').then((m) => m.Dashboard) },
  { path: 'gifts', title: 'Regalos', loadComponent: () => import('./gifts-admin').then((m) => m.GiftsAdmin) },
  { path: 'gifts/new', title: 'Nuevo regalo', loadComponent: () => import('./gift-edit').then((m) => m.GiftEdit) },
  { path: 'gifts/:id', title: 'Editar regalo', loadComponent: () => import('./gift-edit').then((m) => m.GiftEdit) },
  { path: 'categories', title: 'Categorías', loadComponent: () => import('./categories-admin').then((m) => m.CategoriesAdmin) },
  { path: 'invitations', title: 'Invitaciones', loadComponent: () => import('./invitations-admin').then((m) => m.InvitationsAdmin) },
  { path: 'family', title: 'Familia', loadComponent: () => import('./family-admin').then((m) => m.FamilyAdmin) },
];
