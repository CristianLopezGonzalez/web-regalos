import { ApiError } from '../api/api-error';

/*
  Browser plumbing for the demo backend: Web Storage that never throws when it is blocked
  (private mode), hashing like the database does, and photos kept as data URLs.
*/

type StorageArea = 'local' | 'session';
const area = (s: StorageArea) => (s === 'local' ? localStorage : sessionStorage);

export function readStore(storage: StorageArea, key: string): string | null {
  try {
    return area(storage).getItem(key);
  } catch {
    return null;
  }
}

export function writeStore(storage: StorageArea, key: string, value: string | null) {
  try {
    if (value == null) area(storage).removeItem(key);
    else area(storage).setItem(key, value);
  } catch (e) {
    // Blocked storage (private mode) silently falls back to memory; a full quota is reported.
    if (storage === 'local' && e instanceof DOMException && e.name === 'QuotaExceededError')
      throw new ApiError('UNKNOWN', 'La demo se ha quedado sin espacio en este navegador.');
  }
}

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Same digest the database stores for invitation tokens. */
export async function sha256(text: string) {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
}

/** 32 random bytes as hex, like create_invitation(). */
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));

export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
