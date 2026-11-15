import type { SupabaseClient } from '@supabase/supabase-js';
import { GiftImage } from '../models/gift';
import { check } from './supabase-errors';

const SIZES = ['480', '960', '1600'] as const;
const SIGNED_TTL = 60 * 60; // 1 h
/** Re-sign a URL when less than this is left on it. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
/** Folders holding JPEGs (browsers without WebP encoding, i.e. Safari) end with this. */
const JPEG_SUFFIX = '-jpg';

/**
 * Where an upload goes: one folder per upload, named after the time; the format is part of the
 * name so readers know the file extension without another query (older folders are all WebP).
 */
export const photoFolder = (giftId: string, type: string, now = Date.now(), prefix = 'gifts') =>
  `${prefix}/${giftId}/${now}${type === 'image/jpeg' ? JPEG_SUFFIX : ''}`;

export const photoPath = (folder: string, size: string) =>
  `${folder}/${size}.${folder.endsWith(JPEG_SUFFIX) ? 'jpg' : 'webp'}`;

/**
 * Photos in a private Storage bucket: one folder per upload with the three sizes, read through
 * signed URLs that are cached until shortly before they expire. Wishlist gifts live in
 * 'gift-images' under 'gifts/'; the planners' presents in 'plan-images' under 'plans/'.
 */
export class GiftImageStore {
  private readonly signed = new Map<string, { url: string; expires: number }>();

  constructor(
    private readonly client: Promise<SupabaseClient>,
    private readonly bucket = 'gift-images',
    private readonly prefix = 'gifts',
  ) {}

  /** Signs (or re-signs) every size of these folders. Failures leave the "no photo" placeholder. */
  async sign(folders: (string | null)[]) {
    const sb = await this.client;
    const now = Date.now();
    const paths = folders
      .filter((f): f is string => !!f)
      .flatMap((f) => SIZES.map((s) => photoPath(f, s)))
      .filter((p) => {
        const c = this.signed.get(p);
        return !c || c.expires - now < REFRESH_MARGIN_MS;
      });
    if (!paths.length) return;
    const { data, error } = await sb.storage.from(this.bucket).createSignedUrls(paths, SIGNED_TTL);
    if (error) return; // images degrade to the placeholder; data still loads
    for (const d of data ?? []) {
      if (d.signedUrl && d.path)
        this.signed.set(d.path, { url: d.signedUrl, expires: now + SIGNED_TTL * 1000 });
    }
  }

  /** The signed URLs of a folder already passed to sign(), or null. */
  imageFor(folder: string | null): GiftImage | null {
    if (!folder) return null;
    const get = (s: string) => this.signed.get(photoPath(folder, s))?.url;
    const sm = get('480');
    const md = get('960') ?? sm;
    const lg = get('1600') ?? md;
    return sm && md && lg ? { sm, md, lg } : null;
  }

  /**
   * Uploads [480, 960, 1600] into a new folder and returns its path. All or nothing: if any size
   * fails, whatever did get uploaded is removed again before the error is rethrown.
   */
  async upload(giftId: string, blobs: Blob[]): Promise<string> {
    const sb = await this.client;
    const type = blobs[0]?.type || 'image/webp';
    const folder = photoFolder(giftId, type, Date.now(), this.prefix);
    const results = await Promise.allSettled(
      SIZES.map((s, i) =>
        sb.storage
          .from(this.bucket)
          .upload(photoPath(folder, s), blobs[i] ?? blobs[blobs.length - 1], {
            contentType: type,
            upsert: false,
          })
          .then(check),
      ),
    );
    const failed = results.find((r) => r.status === 'rejected');
    if (failed) {
      await this.remove(folder).catch(() => undefined);
      throw failed.reason;
    }
    return folder;
  }

  async remove(folder: string | null) {
    if (!folder) return;
    const sb = await this.client;
    await sb.storage.from(this.bucket).remove(SIZES.map((s) => photoPath(folder, s)));
  }

  /** On sign-out: signed URLs belong to the previous session. */
  clear() {
    this.signed.clear();
  }
}
