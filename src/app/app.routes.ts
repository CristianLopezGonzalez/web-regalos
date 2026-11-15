import { isDevMode } from '@angular/core';
import { Routes } from '@angular/router';
import { guestGuard, listGuard, signedInGuard } from './core/session';

/** Guards only route people sensibly; the database enforces every permission (RLS + RPC). */
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home').then((m) => m.Home) },
  {
    path: 'login',
    title: 'Entrar',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Crear cuenta',
    canMatch: [guestGuard],
    loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'reset-password',
    title: 'Nueva contraseña',
    loadComponent: () => import('./features/auth/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'wishlist',
    title: 'Wishlist',
    canMatch: [signedInGuard],
    loadComponent: () => import('./features/wishlist/wishlist-page').then((m) => m.WishlistPage),
  },
  {
    path: 'wishlist/:id',
    title: 'Regalo',
    canMatch: [signedInGuard],
    loadComponent: () => import('./features/wishlist/gift-page').then((m) => m.GiftPage),
  },
  {
    path: 'profile',
    title: 'Perfil',
    canMatch: [signedInGuard],
    loadComponent: () => import('./features/profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: 'admin',
    canMatch: [listGuard],
    loadComponent: () => import('./features/admin/admin-shell').then((m) => m.AdminShell),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'dev/components',
    title: 'Componentes',
    canMatch: [() => isDevMode()],
    loadComponent: () => import('./features/dev/components-page').then((m) => m.ComponentsPage),
  },
  {
    path: '**',
    title: 'No encontrado',
    loadComponent: () => import('./features/not-found').then((m) => m.NotFound),
  },
];
