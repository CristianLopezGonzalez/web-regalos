import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GiftInput } from '../models/gift';
import { PlanGiftInput } from '../models/plan';
import { photoFolder, photoPath } from './gift-image-store';
import { SupabaseApi } from './supabase-api';
import { SUPABASE_CLIENT } from './supabase-client';

/*
  Regression for 2026-11-15: Safari could not encode WebP, the bucket refused the photo, but the
  gift row had already been created; every retry from the still-open "Nuevo regalo" form added
  another copy. A fake client stands in for PostgREST + Storage with the bucket's real rules.
*/

type Row = Record<string, unknown> & { id: string };
const ok = (data: unknown = null) => ({ data, error: null });
const fail = (message: string) => ({ data: null, error: { message, statusCode: '400' } });

const TABLES = ['gifts', 'plan_gifts', 'plan_people'] as const;
type Table = (typeof TABLES)[number];

function fakeSupabase(opts: { allowed: string[]; failSize?: string }) {
  const db = Object.fromEntries(TABLES.map((t) => [t, new Map<string, Row>()])) as Record<
    Table,
    Map<string, Row>
  >;
  /** Stored files as "<bucket>/<path>". */
  const objects = new Set<string>();
  let seq = 0;

  const table = (name: Table) => {
    if (!db[name]) throw new Error(`unexpected table ${name}`);
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Record<string, unknown> = {};
    let one = false;
    const filters: [string, unknown][] = [];
    const matching = () =>
      [...db[name].values()].filter((r) => filters.every(([col, v]) => r[col] === v));
    const run = () => {
      switch (op) {
        case 'insert': {
          const row = {
            image_path: null,
            gift_status: null,
            created_at: new Date(++seq).toISOString(),
            ...payload,
            id: `${name}-${seq}`,
          } as Row;
          db[name].set(row.id, row);
          return ok(row);
        }
        case 'update':
          matching().forEach((r) => Object.assign(r, payload));
          return ok();
        case 'delete':
          matching().forEach((r) => db[name].delete(r.id));
          return ok();
        default: {
          const rows = matching();
          return ok(one ? (rows[0] ?? null) : rows);
        }
      }
    };
    const q = {
      insert: (p: Record<string, unknown>) => ((op = 'insert'), (payload = p), (one = true), q),
      update: (p: Record<string, unknown>) => ((op = 'update'), (payload = p), q),
      delete: () => ((op = 'delete'), q),
      select: () => q,
      order: () => q,
      eq: (col: string, v: unknown) => (filters.push([col, v]), q),
      single: () => ((one = true), q),
      maybeSingle: () => ((one = true), q),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(run()).then(res, rej),
    };
    return q;
  };

  const bucket = (b: string) => ({
    upload: async (path: string, blob: Blob) => {
      await new Promise((r) => setTimeout(r, 5));
      if (!opts.allowed.includes(blob.type)) return fail(`mime type ${blob.type} is not supported`);
      if (opts.failSize && path.includes(`/${opts.failSize}.`)) return fail('upload failed');
      objects.add(`${b}/${path}`);
      return ok({ path });
    },
    remove: async (paths: string[]) => (paths.forEach((p) => objects.delete(`${b}/${p}`)), ok()),
    createSignedUrls: async (paths: string[]) =>
      ok(
        paths
          .filter((p) => objects.has(`${b}/${p}`))
          .map((p) => ({ path: p, signedUrl: `https://signed/${b}/${p}` })),
      ),
  });

  const client = {
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    from: table,
    rpc: async (fn: string) =>
      fn === 'planners'
        ? ok([
            { id: 'u-cristian', name: 'Cristian' },
            { id: 'u-angela', name: 'Ángela' },
          ])
        : fail(`unexpected rpc ${fn}`),
    storage: { from: bucket },
  };
  return { client: client as unknown as SupabaseClient, gifts: db.gifts, db, objects };
}

const input: GiftInput = {
  name: 'Adidas Spezial',
  description: '',
  price: 100,
  currency: 'EUR',
  purchaseUrl: null,
  categoryId: null,
  priority: 'high',
  isFavorite: false,
};
const photo = (type: string) => [480, 960, 1600].map(() => new Blob(['x'], { type }));

function setup(opts: { allowed: string[]; failSize?: string }) {
  const fake = fakeSupabase(opts);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      SupabaseApi,
      { provide: SUPABASE_CLIENT, useValue: Promise.resolve(fake.client) },
    ],
  });
  return { api: TestBed.inject(SupabaseApi), ...fake };
}

describe('SupabaseApi.createGift with a photo', () => {
  it('rolls the gift back when the bucket refuses the photo (Safari PNG)', async () => {
    const { api, gifts, objects } = setup({ allowed: ['image/webp', 'image/jpeg'] });
    await expect(api.createGift(input, photo('image/png'))).rejects.toMatchObject({
      message: expect.stringContaining('el regalo no se ha guardado'),
    });
    expect(gifts.size).toBe(0);
    expect(objects.size).toBe(0);
  });

  it('removes the sizes that did upload when another one fails', async () => {
    const { api, gifts, objects } = setup({ allowed: ['image/webp'], failSize: '1600' });
    await expect(api.createGift(input, photo('image/webp'))).rejects.toBeTruthy();
    expect(gifts.size).toBe(0);
    expect(objects.size).toBe(0);
  });

  it('retrying after failures never leaves duplicates behind', async () => {
    const { api, gifts } = setup({ allowed: ['image/webp'] });
    for (let i = 0; i < 5; i++)
      await api.createGift(input, photo('image/png')).catch(() => undefined);
    expect(gifts.size).toBe(0);
    const g = await api.createGift(input, photo('image/webp'));
    expect(gifts.size).toBe(1);
    expect(g.image?.lg).toMatch(/\/1600\.webp$/);
  });

  it('stores JPEG photos (browsers without WebP encoding) with .jpg names', async () => {
    const { api, gifts, objects } = setup({ allowed: ['image/webp', 'image/jpeg'] });
    const g = await api.createGift(input, photo('image/jpeg'));
    expect(gifts.size).toBe(1);
    expect(
      [...objects].every((p) => p.startsWith('gift-images/gifts/') && p.endsWith('.jpg')),
    ).toBe(true);
    expect(g.image?.sm).toMatch(/-jpg\/480\.jpg$/);
  });
});

describe('SupabaseApi plans ("Nuestros regalos")', () => {
  const plan = (personId: string, over: Partial<PlanGiftInput> = {}): PlanGiftInput => ({
    personId,
    name: 'Camiseta de la Real Sociedad',
    price: 85,
    currency: 'EUR',
    purchaseUrl: null,
    note: 'Talla L',
    status: 'bought',
    shares: { 'u-angela': 30, 'u-cristian': 55 },
    paidBy: 'u-cristian',
    ...over,
  });

  it('lists the planners from the planners() RPC', async () => {
    const { api } = setup({ allowed: ['image/webp'] });
    expect(await api.listPlanners()).toEqual([
      { id: 'u-cristian', name: 'Cristian' },
      { id: 'u-angela', name: 'Ángela' },
    ]);
  });

  it('maps numeric strings (PostgREST numeric) back to numbers', async () => {
    const { api, db } = setup({ allowed: ['image/webp'] });
    db.plan_people.set('p1', { id: 'p1', name: 'Papá', budget: '150.00', created_at: 'x' });
    db.plan_gifts.set('g1', {
      id: 'g1',
      person_id: 'p1',
      name: 'Camiseta',
      price: '85.00',
      currency: 'EUR',
      purchase_url: null,
      note: null,
      image_path: null,
      status: 'bought',
      shares: { 'u-angela': '30.00', 'u-cristian': 55 },
      paid_by: 'u-cristian',
      created_at: 'x',
      updated_at: 'x',
    });
    expect((await api.listPlanPeople())[0].budget).toBe(150);
    expect((await api.listPlanGifts())[0]).toMatchObject({
      price: 85,
      note: '',
      shares: { 'u-angela': 30, 'u-cristian': 55 },
    });
  });

  it('keeps plan photos in their own private bucket, under plans/', async () => {
    const { api, objects } = setup({ allowed: ['image/webp', 'image/jpeg'] });
    const papa = await api.savePlanPerson(null, { name: 'Papá', budget: 150 });
    const g = await api.savePlanGift(null, plan(papa.id), photo('image/webp'));
    expect(objects.size).toBe(3);
    expect([...objects].every((p) => p.startsWith(`plan-images/plans/${g.id}/`))).toBe(true);
    expect(g.image?.md).toContain('/plan-images/plans/');
  });

  it('rolls a NEW planned gift back when its photo fails, so a retry cannot duplicate it', async () => {
    const { api, db, objects } = setup({ allowed: ['image/webp'] });
    const papa = await api.savePlanPerson(null, { name: 'Papá', budget: null });
    for (let i = 0; i < 3; i++)
      await expect(api.savePlanGift(null, plan(papa.id), photo('image/png'))).rejects.toMatchObject(
        { message: expect.stringContaining('el regalo no se ha guardado') },
      );
    expect(db.plan_gifts.size).toBe(0);
    expect(objects.size).toBe(0);
  });

  it('on update a failed photo keeps the gift and its old photo', async () => {
    const { api, db, objects } = setup({ allowed: ['image/webp'] });
    const papa = await api.savePlanPerson(null, { name: 'Papá', budget: null });
    const g = await api.savePlanGift(null, plan(papa.id), photo('image/webp'));
    await expect(
      api.savePlanGift(g.id, plan(papa.id, { name: 'Otra' }), photo('image/png')),
    ).rejects.toBeTruthy();
    expect(db.plan_gifts.get(g.id)).toMatchObject({ name: 'Camiseta de la Real Sociedad' });
    expect(objects.size).toBe(3);
  });

  it('deleting a person removes the photos of their gifts', async () => {
    const { api, db, objects } = setup({ allowed: ['image/webp'] });
    const papa = await api.savePlanPerson(null, { name: 'Papá', budget: null });
    await api.savePlanGift(null, plan(papa.id), photo('image/webp'));
    // The database cascades the rows; the fake does it by hand like ON DELETE CASCADE would.
    const del = api.deletePlanPerson(papa.id);
    await del;
    for (const [id, r] of db.plan_gifts) if (r['person_id'] === papa.id) db.plan_gifts.delete(id);
    expect(db.plan_people.size).toBe(0);
    expect(objects.size).toBe(0);
  });
});

describe('photo paths', () => {
  it('keep older WebP folders working and tag JPEG ones', () => {
    expect(photoFolder('g1', 'image/webp', 1)).toBe('gifts/g1/1');
    expect(photoFolder('g1', 'image/jpeg', 1)).toBe('gifts/g1/1-jpg');
    expect(photoFolder('g1', 'image/jpeg', 1, 'plans')).toBe('plans/g1/1-jpg');
    expect(photoPath('gifts/g1/1', '960')).toBe('gifts/g1/1/960.webp');
    expect(photoPath('gifts/g1/1-jpg', '960')).toBe('gifts/g1/1-jpg/960.jpg');
  });
});
