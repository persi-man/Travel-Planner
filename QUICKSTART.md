# Quickstart Guide

## Live app (GitHub Pages)

The app runs entirely in your browser — no server, no account:

**https://persi-man.github.io/Travel-Planner/**

Your trips are stored in IndexedDB (local to your browser). Export as JSON regularly to back up.

---

## Local development

### Prerequisites

- **Node.js** 18.17+ (LTS recommended)
- **npm**

### Setup

```bash
git clone https://github.com/persi-man/Travel-Planner
cd Travel-Planner
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

### Build for GitHub Pages

```bash
npm run build:pages
```

Output is in the `out/` folder. To preview locally:

```bash
npx serve out -l 3000
```

Then open [http://127.0.0.1:3000/Travel-Planner/](http://127.0.0.1:3000/Travel-Planner/).

### Smoke tests

```bash
# Against dev server
npm run test:smoke

# Against static build preview
npm run test:smoke:pages
```

---

## Deploy to GitHub Pages

1. Push to the `master` branch
2. GitHub Actions workflow `.github/workflows/deploy-pages.yml` builds and deploys automatically
3. Enable Pages in repo Settings → Pages → Source: **GitHub Actions**

---

## Common issues

- **Port in use**: Next.js will try 3001 — check terminal output
- **Data lost after clearing browser**: Export trips as JSON before clearing site data
- **GitHub Pages 404 on direct URL**: The build copies `index.html` to `404.html` for SPA routing
