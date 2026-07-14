# Security — Travel Planner

## Deployment model

Travel Planner is a **static web app** deployed on GitHub Pages. There is no backend server.

- **Data storage**: IndexedDB in the user's browser (per-device, per-browser)
- **Access model**: Free, no accounts — each visitor has isolated local data
- **Live URL**: https://persi-man.github.io/Travel-Planner/

## Threat model

| Threat | Mitigation |
|--------|------------|
| XSS stealing local trip data | CSP meta tag, safe image src whitelist, dependency updates |
| Malicious file import | 5 MB file limit, 10k row limit, client-side validation |
| Prototype pollution (xlsx) | Row limits, string-only cell handling; migration to exceljs planned |
| Data loss (clear browser data) | Export JSON regularly — banner displayed in app |
| No multi-device sync | By design — use JSON export/import |

## What we do NOT protect against

- **Network exposure of data**: N/A — data never leaves the browser except via explicit export or third-party APIs (geocoding, exchange rates)
- **Physical access to user's machine**: Browser storage is unencrypted
- **User voluntarily sharing export files**: Out of scope

## Reporting

Open an issue at https://github.com/persi-man/Travel-Planner/issues
