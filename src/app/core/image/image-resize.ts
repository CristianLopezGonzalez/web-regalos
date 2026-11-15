/**
 * Resizes a photo in the browser into the three stored sizes (480 / 960 / 1600 px wide).
 * Avoids Supabase Image Transformations (paid) and strips EXIF (location) on the way.
 *
 * WebP when the browser can encode it, JPEG otherwise: Safari (macOS and iOS) cannot encode WebP
 * from a canvas and silently hands back a PNG, which the bucket refuses (wrong type, and a 1600 px
 * PNG can pass the 5 MB limit). All three sizes always share one format.
 */
export const IMAGE_WIDTHS = [480, 960, 1600] as const;
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
/** Below this the photo is still accepted (shop pictures are often 500–800 px), just with a heads-up. */
export const IMAGE_SHARP_SIDE = 800;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const QUALITY = 0.84;

export type ImageFormat = 'image/webp' | 'image/jpeg';
export type ImageCheck = { ok: true } | { ok: false; message: string };

export function checkImageFile(file: File): ImageCheck {
  if (!TYPES.includes(file.type)) return { ok: false, message: 'Sube una foto JPG, PNG o WebP.' };
  if (file.size > IMAGE_MAX_BYTES)
    return { ok: false, message: 'La foto pesa más de 3 MB. Prueba con una más ligera.' };
  return { ok: true };
}

const toBlob = (canvas: HTMLCanvasElement, type: ImageFormat) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto.'))),
      type,
      QUALITY,
    ),
  );

/**
 * WebP if this browser really produces it (the returned blob says what it actually is),
 * JPEG otherwise. Decided once on the first size, then reused for the others.
 */
async function encode(canvas: HTMLCanvasElement, format: ImageFormat | null) {
  if (format) return toBlob(canvas, format);
  const webp = await toBlob(canvas, 'image/webp');
  return webp.type === 'image/webp' ? webp : toBlob(canvas, 'image/jpeg');
}

export async function resizeImage(
  file: File,
): Promise<{ blobs: Blob[]; format: ImageFormat; width: number; height: number; small: boolean }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = bitmap;
  const small = Math.min(width, height) < IMAGE_SHARP_SIDE;
  const blobs: Blob[] = [];
  let format: ImageFormat | null = null;
  for (const w of IMAGE_WIDTHS) {
    const scale = Math.min(1, w / width); // never upscales: a small photo is stored at its real size
    const cw = Math.round(width * scale);
    const ch = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, cw, ch);
    const blob = await encode(canvas, format);
    format = blob.type as ImageFormat;
    blobs.push(blob);
  }
  bitmap.close();
  return { blobs, format: format!, width, height, small };
}
