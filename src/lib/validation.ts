const MAX_TITLE = 200;
const MAX_DESTINATION = 500;
const MAX_COUNTRIES = 12;
const MAX_DESCRIPTION = 5000;
const MAX_ACTIVITY_IMAGES = 10;
const MAX_IMPORT_FILE_BYTES = 5_000_000;
const MAX_IMPORT_ROWS = 10_000;

export function isSafeImageSrc(src: string): boolean {
  if (!src || typeof src !== 'string') return false;
  return /^data:image\/[a-z0-9+.-]+;base64,/i.test(src);
}

export function sanitizeCoverImage(coverImage?: string | null): string | null {
  if (!coverImage) return null;
  if (!isSafeImageSrc(coverImage)) return null;
  return coverImage;
}

export function sanitizeImageArray(images: string[]): string[] {
  return images
    .filter(isSafeImageSrc)
    .slice(0, MAX_ACTIVITY_IMAGES);
}

export function validateTripInput(input: {
  title?: string;
  destination?: string;
  countries?: { code: string; name: string }[];
  startDate?: string;
  endDate?: string;
  budget?: string | number | null;
  coverImage?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const title = input.title?.trim();
  if (!title || title.length > MAX_TITLE) {
    return { ok: false, error: 'Invalid title' };
  }
  if (!input.startDate || !input.endDate) {
    return { ok: false, error: 'Missing dates' };
  }
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { ok: false, error: 'Invalid date range' };
  }
  const destination = (input.destination ?? '').trim();
  if (destination.length > MAX_DESTINATION) {
    return { ok: false, error: 'Destination too long' };
  }

  if (input.countries !== undefined) {
    const codes = new Set<string>();
    for (const country of input.countries) {
      const code = country.code?.trim().toLowerCase();
      const name = country.name?.trim();
      if (!code || code.length !== 2 || !name) {
        return { ok: false, error: 'Invalid country' };
      }
      if (codes.has(code)) {
        return { ok: false, error: 'Duplicate country' };
      }
      codes.add(code);
    }
    if (codes.size === 0) {
      return { ok: false, error: 'At least one country required' };
    }
    if (codes.size > MAX_COUNTRIES) {
      return { ok: false, error: 'Too many countries' };
    }
  }
  if (input.coverImage !== undefined && input.coverImage && !isSafeImageSrc(input.coverImage)) {
    return { ok: false, error: 'Unsupported cover image format.' };
  }
  return { ok: true };
}

export function validateActivityInput(input: {
  title?: string;
  description?: string;
  images?: string[];
}): { ok: true } | { ok: false; error: string } {
  const title = input.title?.trim();
  if (!title || title.length > MAX_TITLE) {
    return { ok: false, error: 'Invalid activity title' };
  }
  if (input.description && input.description.length > MAX_DESCRIPTION) {
    return { ok: false, error: 'Description too long' };
  }
  if (input.images && input.images.length > MAX_ACTIVITY_IMAGES) {
    return { ok: false, error: 'Too many images' };
  }
  return { ok: true };
}

export function validateImportFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, error: 'File too large (max 5 MB)' };
  }
  return { ok: true };
}

export function validateImportRowCount(count: number): { ok: true } | { ok: false; error: string } {
  if (count > MAX_IMPORT_ROWS) {
    return { ok: false, error: 'Too many rows (max 10000)' };
  }
  return { ok: true };
}
