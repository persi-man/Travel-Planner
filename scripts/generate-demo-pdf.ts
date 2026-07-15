/**
 * Generate demo PDF + page screenshots for README/docs.
 * Usage: npx tsx scripts/generate-demo-pdf.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import type { Activity, Day, Trip } from '../src/lib/db/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'pdf-demo');
const PDF_PATH = path.join(OUT_DIR, 'Visite_africaine_itinerary.pdf');

const IMAGE_URLS = {
  cover: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1200&q=85',
  dakar: 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?w=800&q=80',
  goree: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=800&q=80',
  market: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
  food: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
  mosque: 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=800&q=80',
  lake: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  river: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80',
};

function uid(): string {
  return crypto.randomUUID();
}

async function fetchDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function times(dayDate: string, h: number, m: number, durMin: number) {
  const d = new Date(dayDate);
  d.setHours(h, m, 0, 0);
  const start = d.toISOString();
  const end = new Date(d.getTime() + durMin * 60000).toISOString();
  return { start, end };
}

function act(
  day: Day,
  order: number,
  type: string,
  title: string,
  desc: string,
  loc: string,
  h: number,
  m: number,
  durMin: number,
  cost: number,
  images: string[] | null,
): Activity {
  const t = times(day.date, h, m, durMin);
  return {
    id: uid(),
    dayId: day.id,
    type,
    title,
    description: desc,
    location: loc,
    startTime: t.start,
    endTime: t.end,
    cost,
    currency: 'EUR',
    images: images ? JSON.stringify(images) : null,
    order,
  };
}

function buildDays(startIso: string, endIso: string, tripId: string): Day[] {
  const days: Day[] = [];
  const current = new Date(startIso);
  const end = new Date(endIso);
  let index = 0;
  while (current <= end) {
    days.push({
      id: uid(),
      date: new Date(current).toISOString(),
      tripId,
      index,
      activities: [],
    });
    current.setDate(current.getDate() + 1);
    index++;
  }
  return days;
}

async function buildDemoTrip(): Promise<Trip> {
  const imgs = Object.fromEntries(
    await Promise.all(
      Object.entries(IMAGE_URLS).map(async ([k, url]) => [k, await fetchDataUrl(url)]),
    ),
  ) as Record<keyof typeof IMAGE_URLS, string>;

  const now = new Date().toISOString();
  const tripId = uid();
  const days = buildDays('2026-07-14T00:00:00.000Z', '2026-07-21T00:00:00.000Z', tripId);

  days[0].activities = [
    act(days[0], 0, 'transport', 'Arrivée à Dakar', "Installation à l'hôtel et première balade au front de mer.", 'Dakar, Sénégal', 15, 30, 120, 45, [imgs.dakar]),
    act(days[0], 1, 'food', 'Dîner au front de mer', "Thiéboudienne et bissap dans un restaurant avec vue sur l'océan.", 'Corniche de Dakar, Sénégal', 20, 0, 120, 32, [imgs.food]),
  ];
  days[1].activities = [
    act(days[1], 0, 'visit', 'Marché Sandaga', 'Découverte des épices, tissus wax et artisanat local.', 'Marché Sandaga, Dakar', 9, 0, 180, 15, [imgs.market]),
    act(days[1], 1, 'visit', 'Mosquée de la Divinité', 'Architecture contemporaine emblématique de la ville.', 'Mosquée de la Divinité, Dakar', 14, 0, 120, 0, [imgs.mosque]),
    act(days[1], 2, 'food', 'Dégustation yassa poulet', 'Pause gourmande dans un maquis typique.', 'Plateau, Dakar', 18, 30, 90, 18, [imgs.food]),
  ];
  days[2].activities = [
    act(days[2], 0, 'visit', 'Île de Gorée', 'Visite guidée du site historique classé UNESCO.', 'Île de Gorée, Sénégal', 9, 0, 240, 35, [imgs.goree, imgs.dakar]),
    act(days[2], 1, 'food', 'Déjeuner créole', 'Poisson grillé et riz au coco face à la mer.', 'Île de Gorée, Sénégal', 13, 30, 90, 28, [imgs.food]),
  ];
  days[3].activities = [
    act(days[3], 0, 'visit', 'Lac Rose', 'Excursion matinale au lac salé aux reflets rosés.', 'Lac Retba, Sénégal', 7, 0, 240, 55, [imgs.lake]),
    act(days[3], 1, 'activity', 'Atelier artisanat', 'Initiation à la teinture et au tissage traditionnel.', 'Rufisque, Sénégal', 15, 0, 120, 20, [imgs.market]),
    act(days[3], 2, 'lodging', 'Coucher de soleil sur la corniche', "Apéritif au bord de l'Atlantique avant le dîner.", 'Corniche de Dakar', 18, 45, 90, 12, [imgs.dakar]),
  ];
  days[4].activities = [
    act(days[4], 0, 'transport', 'Vol vers Bamako', 'Vol régional Dakar → Bamako.', 'Aéroport Blaise Diagne, Sénégal', 8, 15, 210, 189, null),
    act(days[4], 1, 'food', 'Premier mafé à Bamako', 'Découverte du plat emblématique malien.', 'Bamako, Mali', 19, 30, 120, 22, [imgs.food]),
  ];
  days[5].activities = [
    act(days[5], 0, 'visit', 'Grand Marché de Bamako', 'Immersion dans les couleurs et senteurs du marché.', 'Grand Marché, Bamako', 10, 0, 180, 10, [imgs.market]),
    act(days[5], 1, 'visit', 'Musée national du Mali', "Collections d'art et d'archéologie ouest-africains.", 'Musée national, Bamako', 15, 0, 150, 8, [imgs.mosque]),
  ];
  days[6].activities = [
    act(days[6], 0, 'activity', 'Croisière sur le Niger', 'Balade en pirogue au lever du soleil.', 'Fleuve Niger, Bamako', 6, 30, 240, 75, [imgs.river, imgs.lake]),
    act(days[6], 1, 'food', 'Dîner traditionnel', 'Menu complet avec to et sauce gombo.', 'Bamako, Mali', 20, 0, 120, 25, [imgs.food]),
  ];
  days[7].activities = [
    act(days[7], 0, 'transport', 'Vol vers Brazzaville', "Dernier vol régional avant l'escale au Congo.", 'Aéroport Modibo Keïta, Bamako', 9, 0, 260, 210, null),
  ];

  return {
    id: tripId,
    title: 'Visite africaine',
    destination: 'Sénégal, Mali, Congo-Brazzaville',
    countries: [
      { code: 'sn', name: 'Sénégal' },
      { code: 'ml', name: 'Mali' },
      { code: 'cg', name: 'Congo-Brazzaville' },
    ],
    startDate: '2026-07-14T00:00:00.000Z',
    endDate: '2026-07-21T00:00:00.000Z',
    budget: 2800,
    currency: 'EUR',
    coverImage: imgs.cover,
    createdAt: now,
    updatedAt: now,
    days,
  };
}

async function generatePdfFile(trip: Trip) {
  const { generateTripPdfBytes } = await import('../src/lib/pdfItinerary.ts');
  const data = await generateTripPdfBytes(trip, 'fr');
  fs.writeFileSync(PDF_PATH, Buffer.from(data));
}

async function renderPdfPages() {
  const browser = await chromium.launch({ headless: true });
  const pdfBase64 = fs.readFileSync(PDF_PATH).toString('base64');
  const page = await browser.newPage();
  await page.setViewportSize({ width: 920, height: 1260 });

  await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin:0; background:#d9d4cb; padding:20px; }
    .wrap { max-width:794px; margin:0 auto 28px; }
    .label { color:#5c5348; font-size:12px; margin-bottom:6px; font-family:Georgia,serif; }
    canvas { display:block; background:#fff; box-shadow:0 12px 40px rgba(0,0,0,.22); width:794px; height:auto; }
  </style></head><body><div id="root"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs" type="module"></script>
  <script type="module">
    import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
    const bytes = Uint8Array.from(atob('${pdfBase64}'), c => c.charCodeAt(0));
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    window.__pdfPageCount = pdf.numPages;
    const root = document.getElementById('root');
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i);
      const viewport = pg.getViewport({ scale: 1.34 });
      const wrap = document.createElement('div');
      wrap.className = 'wrap';
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = 'Page ' + i + ' / ' + pdf.numPages;
      const canvas = document.createElement('canvas');
      canvas.id = 'pdf-page-' + i;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      wrap.appendChild(label);
      wrap.appendChild(canvas);
      root.appendChild(wrap);
      await pg.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  </script></body></html>`, { waitUntil: 'networkidle' });

  await page.waitForFunction(() => (window as { __pdfPageCount?: number }).__pdfPageCount! > 0, { timeout: 120000 });
  await page.waitForTimeout(2000);

  const pageCount = await page.evaluate(() => (window as { __pdfPageCount: number }).__pdfPageCount);
  const names: Record<number, string> = {
    1: 'page-01-cover',
    2: 'page-02-summary',
    3: 'page-03-itinerary-start',
  };
  const picks = new Set([1, 2, 3, Math.ceil(pageCount * 0.55), pageCount]);

  for (const n of [...picks].sort((a, b) => a - b)) {
    const locator = page.locator(`#pdf-page-${n}`);
    await locator.scrollIntoViewIfNeeded();
    const name = names[n] ?? `page-${String(n).padStart(2, '0')}-itinerary`;
    const out = path.join(OUT_DIR, `${name}.png`);
    await locator.screenshot({ path: out });
    console.log(`  📸 ${path.relative(ROOT, out)}`);
  }

  await browser.close();
  return pageCount;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('\n📄 Génération PDF démo…\n');
  const trip = await buildDemoTrip();
  await generatePdfFile(trip);
  console.log(`  ✅ PDF: ${path.relative(ROOT, PDF_PATH)}`);
  const pages = await renderPdfPages();

  const appDetail = path.join(ROOT, 'public', 'assets', 'demo-detail.png');
  const appOut = path.join(OUT_DIR, 'app-trip-detail.png');
  if (fs.existsSync(appDetail)) {
    fs.copyFileSync(appDetail, appOut);
    console.log(`  📸 ${path.relative(ROOT, appOut)} (copie app)`);
  }

  console.log(`\n✅ ${pages} pages PDF\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
