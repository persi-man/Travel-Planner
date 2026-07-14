export const EXPORT_APP_NAME = 'Travel Planner';
export const EXPORT_WEBSITE = 'https://mankita.com';
export const EXPORT_WEBSITE_LABEL = 'mankita.com';

export const APP_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
  <path d="M20 5.5C16 5.5 12.8 8.5 12.8 12.2C12.8 16.8 20 24 20 24C20 24 27.2 16.8 27.2 12.2C27.2 8.5 24 5.5 20 5.5Z" fill="#952f24"/>
  <circle cx="20" cy="11.5" r="3.25" fill="#f7f4ef"/>
  <path d="M15.5 28.5V26.8C15.5 25.2 24.5 25.2 24.5 26.8V28.5" stroke="#231f1c" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="13.5" y="28.5" width="13" height="8.5" rx="1.75" stroke="#952f24" stroke-width="1.75" fill="#952f24" fill-opacity="0.16"/>
  <line x1="20" y1="29.5" x2="20" y2="31" stroke="#952f24" stroke-width="1.5" stroke-linecap="round" opacity="0.75"/>
</svg>`;

export function getExportCopyright(year = new Date().getFullYear()): string {
  return `© ${year} Persi MANKITA`;
}

export function getExportFooterLine(year = new Date().getFullYear()): string {
  return `${getExportCopyright(year)} | ${EXPORT_WEBSITE_LABEL}`;
}

export function getExportFooterMarkdown(year = new Date().getFullYear()): string {
  return `${getExportCopyright(year)} | [${EXPORT_WEBSITE_LABEL}](${EXPORT_WEBSITE})`;
}

export function getExportAttributionLine(): string {
  return `${EXPORT_APP_NAME} — ${getExportFooterLine()}`;
}

export function getAppLogoPngDataUrl(size = 96): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const blob = new Blob([APP_LOGO_SVG], { type: 'image/svg+xml;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('CANVAS_UNAVAILABLE'));
        return;
      }
      context.drawImage(image, 0, 0, size, size);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('LOGO_LOAD_FAILED'));
    };

    image.src = objectUrl;
  });
}
