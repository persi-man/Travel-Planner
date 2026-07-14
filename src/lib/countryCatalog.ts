import catalog from './countryCatalog.json';
import type { TripCountry } from './db/types';

type CountryEntry = {
  code: string;
  en: string;
  fr: string;
};

const COUNTRY_CATALOG = catalog as CountryEntry[];

const ALIASES: Record<string, string[]> = {
  vn: ['vietnam', 'viet nam', 'viêt nam'],
  us: ['usa', 'u.s.a', 'etats unis', 'états-unis'],
  gb: ['uk', 'royaume uni', 'angleterre', 'great britain'],
  kr: ['coree du sud', 'corée du sud', 'south korea'],
  kp: ['coree du nord', 'corée du nord', 'north korea'],
  la: ['laos'],
  cz: ['tchequie', 'tchéquie', 'czechia', 'czech republic'],
  ci: ['cote divoire', "côte d'ivoire"],
};

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchScore(query: string, entry: CountryEntry): number {
  const names = [
    entry.en,
    entry.fr,
    ...(ALIASES[entry.code] ?? []),
  ].map(normalizeForSearch);

  let best = 0;
  for (const name of names) {
    const compact = name.replace(/\s+/g, '');
    const qCompact = query.replace(/\s+/g, '');

    if (name === query || compact === qCompact) {
      best = Math.max(best, 100);
    } else if (name.startsWith(query) || compact.startsWith(qCompact)) {
      best = Math.max(best, 80);
    } else if (name.includes(query) || compact.includes(qCompact)) {
      best = Math.max(best, 50);
    }
  }
  return best;
}

export function searchCountryCatalog(
  query: string,
  language: string,
  excludeCodes: string[] = []
): TripCountry[] {
  const q = normalizeForSearch(query);
  if (q.length < 2) return [];

  const excluded = new Set(excludeCodes.map((c) => c.toLowerCase()));

  return COUNTRY_CATALOG.filter((entry) => !excluded.has(entry.code))
    .map((entry) => ({
      entry,
      score: matchScore(q, entry),
      name: language === 'fr' ? entry.fr : entry.en,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, language))
    .slice(0, 8)
    .map((item) => ({ code: item.entry.code, name: item.name }));
}
