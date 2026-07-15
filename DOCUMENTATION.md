# Travel Planner Documentation

## Overview

Travel Planner is a **static web application** for creating, managing, and exporting detailed travel itineraries. Data is stored locally in the browser via **IndexedDB** — no server, no account required.

**Live app**: https://persi-man.github.io/Travel-Planner/

## Architecture

### Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, static export)
- **Language**: TypeScript
- **UI**: React 19, CSS Modules, Lucide icons
- **Storage**: IndexedDB (`travel-planner` database, `trips` store)
- **Export**: jsPDF + jspdf-autotable (PDF), SheetJS `xlsx` (Excel)
- **Import**: pdf.js (PDF), SheetJS (Excel/CSV)
- **Images**: heic2any (HEIC → JPEG in browser)
- **DnD**: @dnd-kit (activity reordering)
- **Deployment**: GitHub Pages via GitHub Actions (Node 22)
- **External APIs** (no API keys): OpenStreetMap Nominatim (geocoding), ExchangeRate API (currency)

### Folder Structure

```
src/
├── app/                    # App Router (Pages)
│   ├── page.tsx            # Home dashboard (import/export)
│   ├── trips/
│   │   ├── new/            # Create trip form
│   │   └── [id]/           # Trip detail / timeline
│   ├── layout.tsx          # Root layout + CSP
│   └── globals.css         # Design tokens & theme
├── components/             # UI components (header, footer, budget…)
├── lib/
│   ├── db/                 # IndexedDB data layer
│   │   ├── store.ts        # IDB connection
│   │   ├── trips.ts        # Trip CRUD
│   │   ├── activities.ts   # Activity CRUD + reorder
│   │   └── types.ts
│   ├── pdfItinerary.ts     # PDF export
│   ├── imageUtils.ts       # Image upload & HEIC conversion
│   ├── activityTime.ts     # Time & duration helpers
│   ├── countries.ts        # Country picker & catalog
│   ├── exportBranding.ts   # PDF/footer branding
│   ├── validation.ts       # Input validation & limits
│   └── safeJson.ts         # Safe JSON/image parsing
└── i18n/                   # FR / EN translations
```

## Data Model

### Trip

| Field       | Type           | Description                              |
| ----------- | -------------- | ---------------------------------------- |
| id          | string         | UUID                                     |
| title       | string         | Trip name (max 200 chars)                |
| destination | string         | Display label (derived from countries)   |
| countries   | TripCountry[]  | ISO codes + names (1–12 countries)       |
| startDate   | ISO            | Start date                               |
| endDate     | ISO            | End date                                 |
| budget      | number         | Optional total budget                    |
| currency    | string         | e.g. EUR                                 |
| coverImage  | string         | `data:image/*;base64,…`                  |
| days        | Day[]          | Nested day records (auto-generated)      |
| createdAt   | ISO            | Creation timestamp                       |
| updatedAt   | ISO            | Last update timestamp                    |

### Day

| Field      | Type       | Description                    |
| ---------- | ---------- | ------------------------------ |
| id         | string     | UUID                           |
| date       | ISO        | Specific date                  |
| tripId     | string     | Parent trip ID                 |
| index      | number     | Day number (0-based)           |
| note       | string     | Optional day note              |
| activities | Activity[] | Nested activities              |

### Activity

| Field       | Type   | Description                                      |
| ----------- | ------ | ------------------------------------------------ |
| id          | string | UUID                                             |
| dayId       | string | Parent day ID                                    |
| type        | string | activity, food, lodging, transport, visit, etc.  |
| title       | string | Name (max 200 chars)                             |
| description | string | Optional (max 5000 chars)                      |
| location    | string | Optional — links to Google Maps                  |
| startTime   | string | Optional `HH:MM`                                 |
| endTime     | string | Optional `HH:MM` (duration computed)             |
| cost        | number | Optional cost                                    |
| currency    | string | e.g. EUR                                         |
| images      | string | JSON array of `data:image/*;base64,…` (max 10)   |
| order       | number | Sort order within the day                        |

## Features

### Trip planning
- Create, edit, delete trips with **multi-country** selection
- Automatic **day-by-day timeline** from start to end date
- Activities with type, time, **duration**, location, description, cost, currency and photos
- **Drag & drop** to reorder activities within a day or move between days
- Location suggestions filtered by selected countries (Nominatim)
- Budget tracker with multi-currency totals (ExchangeRate API)
- Cover images including **HEIC** conversion in the browser

### Import & export
- **Import a trip** from JSON, Markdown, plain text, CSV, Excel or PDF (homepage)
- **Import activities** into an existing trip (Excel/CSV)
- **Export** in 8 formats: JSON, Markdown, PDF, Excel, plain text, Google Maps route, `.ics`, Google Calendar links

### UX
- **French / English** interface
- Light and dark themes
- Responsive layout with an editorial “travel journal” design
- Local-data banner reminding users to back up via JSON export

## Build & Deploy

```bash
# Local dev
npm run dev

# Build for GitHub Pages
npm run build:pages

# Preview static build locally
npm run preview:pages

# Smoke tests
npm run test:smoke
npm run test:smoke:pages
```

Push to `master` triggers automatic deploy via `.github/workflows/deploy-pages.yml`.

## Security

See [SECURITY.md](./SECURITY.md) for the threat model, CSP policy, validation limits and mitigations.
