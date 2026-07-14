import { isSafeImageSrc, sanitizeImageArray } from './validation';

export function safeParseImageArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sanitizeImageArray(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return [];
  }
}

export function serializeImages(images: string[] | string | null | undefined): string | null {
  if (!images) return null;
  if (typeof images === 'string') {
    const parsed = safeParseImageArray(images.startsWith('[') ? images : JSON.stringify(images.split('|').filter(Boolean)));
    return parsed.length > 0 ? JSON.stringify(parsed) : null;
  }
  const safe = sanitizeImageArray(images);
  return safe.length > 0 ? JSON.stringify(safe) : null;
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
