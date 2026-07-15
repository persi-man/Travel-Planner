# Quickstart Guide

## Live app (GitHub Pages)

Travel Planner runs entirely in your browser — no server, no account:

**https://persi-man.github.io/Travel-Planner/**

Trips are stored in **IndexedDB** (local to your browser and device). Export as **JSON** regularly to keep a backup.

---

## Local development

### Prerequisites

- **Node.js** 22+ (matches CI; 18.17+ may work locally)
- **npm**

### Setup

```bash
git clone https://github.com/persi-man/Travel-Planner.git
cd Travel-Planner
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

### What you can try

1. **New trip** — title, countries, dates, budget, cover photo (JPEG/PNG/HEIC)
2. **Activities** — time, duration, location, cost, photos; drag to reorder
3. **Export** — JSON, PDF, Excel, Markdown, TXT, Maps route, `.ics`, Google Calendar
4. **Import** — trip from JSON / Markdown / TXT / CSV / Excel / PDF (homepage)

---

## Build for GitHub Pages

```bash
npm run build:pages
```

Static files are written to `out/`.

### Preview the production build

```bash
npm run build:pages
npm run preview:pages
```

Open [http://127.0.0.1:3000/Travel-Planner/](http://127.0.0.1:3000/Travel-Planner/) — `/` redirects to the app base path.

> **Note:** `preview:pages` mirrors GitHub Pages (`/Travel-Planner/` base path). For day-to-day coding, use `npm run dev` (app served at `/`).

---

## Smoke tests

```bash
# Dev server (http://127.0.0.1:3000)
npm run test:smoke

# Static preview (http://127.0.0.1:3000/Travel-Planner/)
npm run test:smoke:pages
```

---

## Deploy to GitHub Pages

1. Push to the `master` branch
2. Workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) builds with Node 22 and deploys `out/`
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**

---

## Common issues

| Issue | What to do |
|-------|------------|
| **Port 3000 in use** | Next.js falls back to 3001 — check the terminal URL |
| **Data lost** | Browser storage was cleared — restore from a JSON export |
| **404 on deep link (GitHub Pages)** | Build copies `index.html` → `404.html` for client-side routing |
| **Cover image fails** | Prefer JPEG/PNG; HEIC is converted in-browser (needs a modern browser) |
| **Budget totals wrong** | ExchangeRate API must be reachable (`connect-src` in CSP) |

---

## More docs

- [README.md](./README.md) — overview, screenshots, feature list
- [DOCUMENTATION.md](./DOCUMENTATION.md) — architecture & data model
- [SECURITY.md](./SECURITY.md) — client-side security notes
