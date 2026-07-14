const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  pjpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

function extensionFromName(name: string): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : null;
}

export function resolveImageMime(file: File): string | null {
  const normalizedType = file.type.trim().toLowerCase();
  if (normalizedType.startsWith('image/')) {
    return normalizedType;
  }

  const ext = extensionFromName(file.name);
  if (!ext) return null;
  return EXTENSION_TO_MIME[ext] ?? null;
}

async function sniffImageMime(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (header.length < 4) return null;

  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'image/jpeg';
  }
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    return 'image/png';
  }
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
    return 'image/gif';
  }
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (header.length >= 12) {
    const brand = String.fromCharCode(header[8], header[9], header[10], header[11]).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1'].includes(brand)) {
      return 'image/heic';
    }
  }

  return null;
}

function normalizeDataUrl(dataUrl: string, mime: string): string {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return dataUrl;
  const payload = dataUrl.slice(commaIndex + 1);
  return `data:${mime};base64,${payload}`;
}

function blobToDataUrl(blob: Blob, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('FILE_READ_FAILED'));
        return;
      }
      resolve(normalizeDataUrl(reader.result, mime));
    };
    reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
    reader.readAsDataURL(blob);
  });
}

async function readAsRawDataUrl(file: File, mime: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function canvasToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
): string {
  const maxEdge = 4096;
  let targetWidth = width;
  let targetHeight = height;

  if (targetWidth > maxEdge || targetHeight > maxEdge) {
    const scale = maxEdge / Math.max(targetWidth, targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('NO_CANVAS');
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.9);
}

async function fileToJpegViaBitmap(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    return canvasToJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

async function fileToJpegViaImage(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
      img.src = url;
    });
    return canvasToJpeg(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function convertHeicToJpeg(file: File): Promise<string> {
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return blobToDataUrl(blob, 'image/jpeg');
}

function isHeicLike(mime: string): boolean {
  return mime.includes('heic') || mime.includes('heif');
}

async function readRawDataUrl(file: File, mime: string): Promise<string> {
  try {
    return await blobToDataUrl(file, mime);
  } catch {
    return readAsRawDataUrl(file, mime);
  }
}

async function tryConvertToJpeg(file: Blob): Promise<string | null> {
  const attempts = [() => fileToJpegViaBitmap(file), () => fileToJpegViaImage(file)];

  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch {
      // Try the next decoder.
    }
  }

  return null;
}

export async function readImageFile(file: File): Promise<string> {
  if (!file) {
    throw new Error('NO_FILE');
  }
  if (file.size === 0) {
    throw new Error('EMPTY_FILE');
  }

  const mime = resolveImageMime(file) ?? (await sniffImageMime(file)) ?? 'image/jpeg';

  if (isHeicLike(mime)) {
    try {
      return await convertHeicToJpeg(file);
    } catch (error) {
      console.warn('HEIC conversion failed, keeping raw file if possible', error);
    }
  }

  const jpeg = await tryConvertToJpeg(file);
  if (jpeg) {
    return jpeg;
  }

  const raw = await readRawDataUrl(file, mime);
  if (raw.startsWith('data:image/')) {
    return raw;
  }

  throw new Error('FILE_READ_FAILED');
}
