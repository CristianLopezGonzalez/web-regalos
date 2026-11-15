import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Chrome/Edge/Samsung fire this once, possibly before Angular is up: keep it for the "Instalar app" button
// (core/pwa.ts). No preventDefault, so the browser's own install hint still appears too.
addEventListener('beforeinstallprompt', (e) => ((window as { __installPrompt?: Event }).__installPrompt = e));

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
