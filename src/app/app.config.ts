import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { useSupabase } from './core/config';
import { DemoApi } from './core/demo-api';
import { PageTitle } from './core/page-title';
import { SupabaseApi } from './core/supabase-api';
import { WishlistApi } from './core/wishlist-api';
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
    // Supabase as soon as core/config.ts has a URL and anon key; otherwise the in-browser demo.
    { provide: WishlistApi, useClass: useSupabase() ? SupabaseApi : DemoApi },
  ],
};
