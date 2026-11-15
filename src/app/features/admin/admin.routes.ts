import { Routes } from '@angular/router';
import { ownerGuard } from '../../core/session';

// /admin is open to everyone with a list of their own (listGuard); these three stay the owner's.

export const ADMIN_ROUTES: Routes = [
  { path: '', title: 'Resumen', loadComponent: () => import('./dashboard').then((m) => m.Dashboard) },
  { path: 'gifts', title: 'Regalos', loadComponent: () => import('./gifts-admin').then((m) => m.GiftsAdmin) },
  { path: 'gifts/new', title: 'Nuevo regalo', loadComponent: () => import('./gift-edit').then((m) => m.GiftEdit) },
  { path: 'gifts/:id', title: 'Editar regalo', loadComponent: () => import('./gift-edit').then((m) => m.GiftEdit) },
  { path: 'categories', canMatch: [ownerGuard], title: 'Categorías', loadComponent: () => import('./categories-admin').then((m) => m.CategoriesAdmin) },
  { path: 'invitations', canMatch: [ownerGuard], title: 'Invitaciones', loadComponent: () => import('./invitations-admin').then((m) => m.InvitationsAdmin) },
  { path: 'family', canMatch: [ownerGuard], title: 'Familia', loadComponent: () => import('./family-admin').then((m) => m.FamilyAdmin) },
];
