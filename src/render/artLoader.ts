import { Texture } from 'pixi.js';

/**
 * Loads an optional image. Returns null (quietly) when the file is missing or isn't an image,
 * so callers can fall back to built-in art. The dev server answers missing files with the
 * HTML page, hence the content-type check.
 */
export async function loadOptionalImage(url: string): Promise<Texture | null> {
  try {
    const res = await fetch(url);
    if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
    const bitmap = await createImageBitmap(await res.blob());
    return Texture.from(bitmap);
  } catch {
    return null;
  }
}
