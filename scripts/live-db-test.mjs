/**
 * IndexedDB CRUD live test (runs in Node with experimental fake-indexeddb or via Playwright).
 * Uses Playwright if available, otherwise skips with message.
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const BASE = process.argv[2] || 'http://127.0.0.1:3000';

let passed = 0;
let failed = 0;

function ok(name) {
  passed++;
  console.log(`  ✅ ${name}`);
}

function fail(name, detail) {
  failed++;
  console.log(`  ❌ ${name}: ${detail}`);
}

async function main() {
  console.log(`\n🧪 IndexedDB live tests — ${BASE}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });

    // Test 1: Create trip via UI flow
    await page.goto(`${BASE}/trips/new/`, { waitUntil: 'networkidle' });
    await page.fill('input[name="title"]', 'E2E Test Trip');
    await page.fill('input[placeholder*="Rome"]', 'Tokyo, Japan');
    await page.fill('input[name="startDate"]', '2026-09-01');
    await page.fill('input[name="endDate"]', '2026-09-03');
    await page.fill('input[name="budget"]', '2000');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`, { timeout: 10000 });
    ok('Create trip via UI');

    // Test 2: Trip appears on homepage
    const cardText = await page.textContent('body');
    if (cardText?.includes('E2E Test Trip') && cardText?.includes('Tokyo')) {
      ok('Trip visible on homepage');
    } else {
      fail('Trip visible on homepage', 'card not found');
    }

    // Test 3: Open trip detail
    await page.click('text=E2E Test Trip');
    await page.waitForURL(/\/trips\//, { timeout: 10000 });
    const detailText = await page.textContent('body');
    if (detailText?.includes('E2E Test Trip') && detailText?.includes('Day')) {
      ok('Trip detail page loads');
    } else {
      fail('Trip detail page', 'content missing');
    }

    // Test 4: Persistence after reload
    const tripUrl = page.url();
    await page.reload({ waitUntil: 'networkidle' });
    const afterReload = await page.textContent('body');
    if (afterReload?.includes('E2E Test Trip')) {
      ok('Data persists after reload (IndexedDB)');
    } else {
      fail('Persistence after reload', 'trip gone');
    }

    // Test 5: Add activity
    await page.click('button:has-text("Add")');
    await page.waitForSelector('input[placeholder*="Activity"], h3');
    const titleInputs = page.locator('input').filter({ has: page.locator('xpath=..') });
    await page.locator('form input[type="text"]').first().fill('Visit Senso-ji');
    await page.locator('select').first().selectOption('activity').catch(() => {});
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    const withActivity = await page.textContent('body');
    if (withActivity?.includes('Senso-ji') || withActivity?.includes('Visit')) {
      ok('Add activity');
    } else {
      // Activity form may use different structure - check IndexedDB directly
      const dbCount = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const req = indexedDB.open('travel-planner');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('trips', 'readonly');
            const getAll = tx.objectStore('trips').getAll();
            getAll.onsuccess = () => {
              const trips = getAll.result;
              const activities = trips.flatMap((t) => t.days.flatMap((d) => d.activities));
              resolve(activities.length);
            };
          };
        });
      });
      if (dbCount > 0) ok(`Add activity (IndexedDB has ${dbCount} activities)`);
      else fail('Add activity', 'no activities in IndexedDB');
    }

    // Test 6: IndexedDB has data
    const tripCount = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const req = indexedDB.open('travel-planner');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('trips', 'readonly');
          const getAll = tx.objectStore('trips').getAll();
          getAll.onsuccess = () => resolve(getAll.result.length);
        };
      });
    });
    if (tripCount >= 1) {
      ok(`IndexedDB contains ${tripCount} trip(s)`);
    } else {
      fail('IndexedDB storage', 'empty');
    }

    // Test 7: Delete trip
    await page.goto(tripUrl, { waitUntil: 'networkidle' });
    page.on('dialog', (d) => d.accept());
    await page.click('button:has-text("Delete")');
    await page.waitForURL(`${BASE}/`, { timeout: 10000 });
    const homeAfterDelete = await page.textContent('body');
    if (!homeAfterDelete?.includes('E2E Test Trip')) {
      ok('Delete trip');
    } else {
      fail('Delete trip', 'still visible');
    }

  } catch (e) {
    fail('Test suite', e.message);
  } finally {
    await browser.close();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Playwright not available or test failed:', e.message);
  console.log('Install with: npx playwright install chromium');
  process.exit(1);
});
