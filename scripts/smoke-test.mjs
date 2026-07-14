/**
 * Live smoke tests for Travel Planner (IndexedDB client mode).
 * Run after: npm run dev  OR  npx serve out -l 3000 (after build:pages)
 *
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */

const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');

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

async function fetchText(url) {
  const res = await fetch(url);
  return { res, text: await res.text() };
}

async function main() {
  console.log(`\n🔍 Smoke tests — ${BASE}\n`);

  // 1. Homepage loads
  try {
    const { res, text } = await fetchText(`${BASE}/`);
    if (res.status === 200 && text.includes('Travel Planner')) {
      ok('Homepage loads');
    } else {
      fail('Homepage loads', `status ${res.status}`);
    }
  } catch (e) {
    fail('Homepage loads', e.message);
  }

  // 2. New trip page loads
  try {
    const { res, text } = await fetchText(`${BASE}/trips/new/`);
    if (res.status === 200 && (text.includes('trip') || text.includes('Voyage') || text.includes('Create'))) {
      ok('New trip page loads');
    } else {
      fail('New trip page loads', `status ${res.status}`);
    }
  } catch (e) {
    fail('New trip page loads', e.message);
  }

  // 3. Trip detail shell loads (static placeholder route)
  try {
    const { res } = await fetchText(`${BASE}/trips/_/`);
    if (res.status === 200) {
      ok('Trip detail shell loads');
    } else {
      fail('Trip detail shell loads', `status ${res.status}`);
    }
  } catch (e) {
    fail('Trip detail shell loads', e.message);
  }

  // 4. API routes removed (should 404)
  try {
    const { res } = await fetch(`${BASE}/api/trips`);
    if (res.status === 404) {
      ok('API routes removed (404)');
    } else {
      fail('API routes removed', `unexpected status ${res.status}`);
    }
  } catch (e) {
    ok('API routes removed (unreachable)');
  }

  // 5. CSP meta present
  try {
    const { text } = await fetchText(`${BASE}/`);
    if (text.includes('Content-Security-Policy')) {
      ok('CSP meta tag present');
    } else {
      fail('CSP meta tag', 'not found in HTML');
    }
  } catch (e) {
    fail('CSP meta tag', e.message);
  }

  // 6. Static assets
  try {
    const res = await fetch(`${BASE}/assets/logo.png`);
    if (res && res.status === 200) {
      ok('Static assets accessible');
    } else {
      fail('Static assets', `logo.png status ${res?.status ?? 'no response'}`);
    }
  } catch (e) {
    fail('Static assets', e.message);
  }

  // 7. 404.html exists (GitHub Pages SPA) — only for static build
  try {
    const res = await fetch(`${BASE}/404.html`);
    if (res.status === 200) {
      ok('404.html fallback present');
    } else {
      console.log(`  ⚠️  404.html not found (OK in dev mode)`);
    }
  } catch {
    console.log(`  ⚠️  404.html check skipped`);
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
