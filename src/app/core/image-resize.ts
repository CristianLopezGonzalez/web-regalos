/**
 * Resizes a photo in the browser into the three stored sizes (480 / 960 / 1600 px wide, WebP).
 * Avoids Supabase Image Transformations (paid) and strips EXIF (location) on the way.
 */
export const IMAGE_WIDTHS = [480, 960, 1600] as const;
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_MIN_SIDE = 800;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type ImageCheck = { ok: true } | { ok: false; message: string };

export function checkImageFile(file: File): ImageCheck {
  if (!TYPES.includes(file.type)) return { ok: false, message: 'Sube una foto JPG, PNG o WebP.' };
  if (file.size > IMAGE_MAX_BYTES) return { ok: false, message: 'La foto pesa más de 8 MB. Prueba con una más ligera.' };
  return { ok: true };
}

export async function resizeImage(file: File): Promise<{ blobs: Blob[]; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = bitmap;
  if (Math.min(width, height) < IMAGE_MIN_SIDE) {
    bitmap.close();
    throw new Error(`La foto es pequeña (${width}×${height}). Usa una de al menos ${IMAGE_MIN_SIDE} px por lado.`);
  }
  const blobs: Blob[] = [];
  for (const w of IMAGE_WIDTHS) {
    const scale = Math.min(1, w / width);
    const cw = Math.round(width * scale);
    const ch = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, cw, ch);
    blobs.push(
      await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo procesar la foto.'))), 'image/webp', 0.84),
      ),
    );
  }
  bitmap.close();
  return { blobs, width, height };
}
