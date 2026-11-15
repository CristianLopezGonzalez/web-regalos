import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';
import { WishlistApi } from './core/api/wishlist-api';
import { DemoApi } from './core/demo/demo-api';

describe('App', () => {
  it('creates the shell', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: WishlistApi, useClass: DemoApi },
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
