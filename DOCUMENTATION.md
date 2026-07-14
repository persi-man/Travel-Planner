# Travel Planner Documentation

## Overview

Travel Planner is a **static web application** for creating, managing, and exporting detailed travel itineraries. Data is stored locally in the browser via **IndexedDB** — no server, no account required.

**Live app**: https://persi-man.github.io/Travel-Planner/

## Architecture

### Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, static export)
- **Language**: TypeScript
- **Storage**: IndexedDB (browser-local, per device)
- **Styling**: CSS Modules with a custom Design System
- **Export**: `jspdf` (PDF), `xlsx` (Excel)
- **Deployment**: GitHub Pages via GitHub Actions
- **Icons**: Lucide React

### Folder Structure

```
src/
├── app/                    # App Router (Pages)
│   ├── page.tsx            # Home dashboard
│   ├── trips/
│   │   ├── new/            # Create trip form
│   │   └── [id]/           # Trip detail / timeline
│   ├── layout.tsx          # Root layout + CSP
│   └── globals.css
├── components/             # UI components
├── lib/
│   ├── db/                 # IndexedDB data layer
│   │   ├── store.ts        # IDB connection
│   │   ├── trips.ts        # Trip CRUD
│   │   ├── activities.ts   # Activity CRUD
│   │   └── types.ts
│   ├── validation.ts       # Input validation
│   ├── safeJson.ts         # Safe JSON/image parsing
│   └── currency.ts         # Exchange rates
└── i18n/                   # FR / EN translations
```

## Data Model

### Trip

| Field       | Type   | Description           |
| ----------- | ------ | --------------------- |
| id          | string | UUID                  |
| title       | string | Trip name             |
| destination | string | Target location       |
| startDate   | ISO    | Start date            |
| endDate     | ISO    | End date              |
| budget      | number | Optional total budget |
| currency    | string | e.g. EUR              |
| coverImage  | string | data:image base64     |
| days        | Day[]  | Nested day records    |

### Day

| Field      | Type       | Description     |
| ---------- | ---------- | --------------- |
| id         | string     | UUID            |
| date       | ISO        | Specific date   |
| index      | number     | Day number      |
| activities | Activity[] | Nested activities |

### Activity

| Field       | Type   | Description                          |
| ----------- | ------ | ------------------------------------ |
| id          | string | UUID                                 |
| type        | string | activity, food, lodging, travel      |
| title       | string | Name                                 |
| startTime   | ISO    | Optional time                        |
| cost        | number | Optional cost                        |
| location    | string | Optional location                    |
| images      | string | JSON array of data:image URLs        |

## Features

- **Trip management**: Create, edit, delete with automatic day generation
- **Day-by-day timeline**: Activities with drag & drop between days
- **Budget tracking**: Multi-currency with live exchange rates
- **Import / Export**: JSON, PDF, Excel, Markdown, ICS, Google Calendar
- **i18n**: French and English
- **Theme**: Light / dark mode

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

See [SECURITY.md](./SECURITY.md) for the threat model and mitigations.
