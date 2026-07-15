# Security — Travel Planner

## Deployment model

Travel Planner is a **static web app** deployed on GitHub Pages. There is no backend server.

- **Data storage**: IndexedDB in the user's browser (per-device, per-browser)
- **Access model**: Free, no accounts — each visitor has isolated local data
- **Live URL**: https://persi-man.github.io/Travel-Planner/
- **Secrets**: None in the repository — external APIs (geocoding, exchange rates) are keyless

## Threat model

| Threat | Mitigation |
|--------|------------|
| XSS stealing local trip data | Content-Security-Policy meta tag, safe image src whitelist (`data:image/*` only), no `dangerouslySetInnerHTML` on user content |
| Malicious file import | 5 MB file limit, 10 000 row limit, client-side validation (`validation.ts`) |
| Oversized / malformed inputs | Title 200 chars, description 5000 chars, max 12 countries, max 10 activity images |
| Prototype pollution (xlsx) | Row limits, string-only cell handling; migration to exceljs planned |
| Cross-trip activity IDOR | Activity lookups verify parent trip ownership before update/delete |
| Supply chain (CVE) | jspdf kept at 4.2.1+; dependency updates via npm audit |
| Data loss (clear browser data) | Export JSON regularly — banner displayed in app |
| No multi-device sync | By design — use JSON export/import |

## Content Security Policy

Defined in `src/app/layout.tsx`:

| Directive | Value |
|-----------|-------|
| `default-src` | `'self'` |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval' cdnjs.cloudflare.com` (pdf.js worker) |
| `style-src` | `'self' 'unsafe-inline'` |
| `img-src` | `'self' data: blob:` |
| `worker-src` | `'self' blob:` |
| `connect-src` | `'self' api.exchangerate-api.com nominatim.openstreetmap.org` |
| `frame-ancestors` | `'none'` |
| `base-uri` | `'self'` |
| `form-action` | `'self'` |

Activity and cover images are stored as **base64 data URLs** only — external image URLs are not accepted in stored data.

## Validation limits

| Limit | Value |
|-------|-------|
| Trip title | 200 characters |
| Destination | 500 characters |
| Countries per trip | 1–12 |
| Activity description | 5000 characters |
| Activity images | 10 per activity |
| Import file size | 5 MB |
| Import rows | 10 000 |

## Third-party services

| Service | Data sent | Purpose |
|---------|-----------|---------|
| OpenStreetMap Nominatim | Location search queries | Autocomplete suggestions |
| ExchangeRate API | None (public endpoint) | Currency conversion for budget |

No user trip data is sent to these services.

## What we do NOT protect against

- **Network exposure of data**: N/A — data never leaves the browser except via explicit export or the third-party APIs above
- **Physical access to user's machine**: Browser storage is unencrypted
- **User voluntarily sharing export files**: Out of scope
- **Malicious browser extensions**: Can read IndexedDB on the same origin

## Reporting

Open an issue at https://github.com/persi-man/Travel-Planner/issues
