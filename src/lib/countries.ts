export interface TripCountry {
  code: string;
  name: string;
}

const MAX_COUNTRIES = 12;

export function normalizeCountries(countries?: TripCountry[] | null): TripCountry[] {
  if (!countries?.length) return [];

  const seen = new Set<string>();
  const result: TripCountry[] = [];

  for (const entry of countries) {
    const code = entry.code?.trim().toLowerCase();
    const name = entry.name?.trim();
    if (!code || code.length !== 2 || !name || seen.has(code)) continue;
    seen.add(code);
    result.push({ code, name });
    if (result.length >= MAX_COUNTRIES) break;
  }

  return result;
}

export function countriesToDestination(countries: TripCountry[]): string {
  return normalizeCountries(countries)
    .map((c) => c.name)
    .join(', ');
}

export function getCountryCodes(countries?: TripCountry[] | null): string[] {
  return normalizeCountries(countries).map((c) => c.code);
}

export function formatCountriesLabel(countries?: TripCountry[] | null, fallback = ''): string {
  const label = countriesToDestination(countries ?? []);
  return label || fallback;
}
