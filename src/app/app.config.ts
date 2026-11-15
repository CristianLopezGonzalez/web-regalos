import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router';
import { useSupabase } from './core/config/supabase-config';
import { DemoApi } from './core/demo/demo-api';
import { PageTitle } from './core/routing/page-title';
import { SupabaseApi } from './core/supabase/supabase-api';
import { WishlistApi } from './core/api/wishlist-api';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    { provide: TitleStrategy, useClass: PageTitle },
    // Supabase as soon as core/config/supabase-config.ts has a URL and anon key; otherwise the in-browser demo.
    { provide: WishlistApi, useClass: useSupabase() ? SupabaseApi : DemoApi },
    // Installable app (Android/iOS). Only in production builds; caches the app shell, never Supabase data.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
