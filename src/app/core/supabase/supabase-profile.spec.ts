import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseApi } from './supabase-api';
import { SUPABASE_CLIENT } from './supabase-client';

/*
  Regression for 2026-11-15: the new frontend selected profiles.is_planner before the migration
  that adds it had run. Every profile read failed and syncProfile signed people out, so nobody
  could log in. Now the read falls back to the old columns, and a failed read never signs out.
*/

type Db = 'legacy' | 'migrated' | 'down';

function fakeClient(db: Db) {
  const row = {
    id: 'u1',
    email: 'yo@ejemplo.com',
    display_name: 'Cristian',
    role: 'owner',
    has_list: true,
    created_at: '2026-11-14T00:00:00Z',
  };
  const signOut = vi.fn(async () => ({ error: null }));
  const profiles = () => {
    let cols = '';
    const q = {
      select: (c: string) => ((cols = c), q),
      eq: () => q,
      maybeSingle: () => q,
      then: (res: (v: unknown) => unknown) => {
        if (db === 'down')
          return Promise.resolve({
            data: null,
            error: { code: '', message: 'Failed to fetch' },
          }).then(res);
        if (db === 'legacy' && cols.includes('is_planner'))
          return Promise.resolve({
            data: null,
            error: { code: '42703', message: 'column profiles.is_planner does not exist' },
          }).then(res);
        const data = db === 'migrated' ? { ...row, is_planner: true } : row;
        return Promise.resolve({ data, error: null }).then(res);
      },
    };
    return q;
  };
  const client = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }),
      signOut,
    },
    from: () => profiles(),
  };
  return { client: client as unknown as SupabaseClient, signOut };
}

function setup(db: Db) {
  const fake = fakeClient(db);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      SupabaseApi,
      { provide: SUPABASE_CLIENT, useValue: Promise.resolve(fake.client) },
    ],
  });
  return { api: TestBed.inject(SupabaseApi), signOut: fake.signOut };
}

describe('SupabaseApi profile loading', () => {
  it('still signs in on a database without is_planner (migration not run yet)', async () => {
    const { api, signOut } = setup('legacy');
    await api.signIn('yo@ejemplo.com', 'secreto');
    expect(api.profile()).toMatchObject({ displayName: 'Cristian', isPlanner: false });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('reads is_planner once the migration has run', async () => {
    const { api } = setup('migrated');
    await api.signIn('yo@ejemplo.com', 'secreto');
    expect(api.profile()?.isPlanner).toBe(true);
  });

  it('a failed profile read is reported, not turned into a sign-out or "wrong password"', async () => {
    const { api, signOut } = setup('down');
    await expect(api.signIn('yo@ejemplo.com', 'secreto')).rejects.toMatchObject({
      message: expect.stringContaining('No se pudo cargar tu perfil'),
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  // 2026-11-15: the default scope ('global') revoked every session of the account, so signing out
  // on the computer logged the phone out too.
  it('signing out only ends the session on this device', async () => {
    const { api, signOut } = setup('migrated');
    await api.signIn('yo@ejemplo.com', 'secreto');
    await api.signOut();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(api.profile()).toBeNull();
  });
});
