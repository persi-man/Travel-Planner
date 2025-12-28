// Exchange rates API using free exchangerate-api.com
// Rates are cached in localStorage for 1 hour to reduce API calls

const CACHE_KEY = 'exchange_rates';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface ExchangeRates {
  base: string;
  rates: { [key: string]: number };
  timestamp: number;
}

let cachedRates: ExchangeRates | null = null;

export async function getExchangeRates(baseCurrency: string = 'EUR'): Promise<{ [key: string]: number }> {
  // Check memory cache first
  if (cachedRates && cachedRates.base === baseCurrency && Date.now() - cachedRates.timestamp < CACHE_DURATION) {
    return cachedRates.rates;
  }
  
  // Check localStorage cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ExchangeRates;
        if (parsed.base === baseCurrency && Date.now() - parsed.timestamp < CACHE_DURATION) {
          cachedRates = parsed;
          return parsed.rates;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }
  }
  
  try {
    // Using free API - no key required for basic usage
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    if (!response.ok) throw new Error('API error');
    
    const data = await response.json();
    const rates: ExchangeRates = {
      base: baseCurrency,
      rates: data.rates,
      timestamp: Date.now()
    };
    
    cachedRates = rates;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(rates));
    }
    
    return rates.rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    // Return fallback rates if API fails
    return getFallbackRates(baseCurrency);
  }
}

// Fallback rates in case API is unavailable
function getFallbackRates(base: string): { [key: string]: number } {
  const fallbackEUR: { [key: string]: number } = {
    EUR: 1,
    USD: 1.08,
    GBP: 0.86,
    JPY: 162.5,
    LKR: 340,
    THB: 38.5,
    LAK: 22500,
    PHP: 61.5
  };
  
  if (base === 'EUR') return fallbackEUR;
  
  // Convert to requested base
  const euroRate = fallbackEUR[base] || 1;
  const converted: { [key: string]: number } = {};
  
  for (const [currency, rate] of Object.entries(fallbackEUR)) {
    converted[currency] = rate / euroRate;
  }
  
  return converted;
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  if (!amount) return 0;
  
  const rates = await getExchangeRates(toCurrency);
  const fromRate = rates[fromCurrency];
  
  if (!fromRate) {
    console.warn(`Unknown currency: ${fromCurrency}`);
    return amount;
  }
  
  return amount / fromRate;
}

export async function calculateTotalInCurrency(
  activities: Array<{ cost?: number | null | undefined; currency?: string | null | undefined }>,
  targetCurrency: string
): Promise<number> {
  const rates = await getExchangeRates(targetCurrency);
  let total = 0;
  
  for (const activity of activities) {
    if (activity.cost && activity.cost > 0) {
      const currency = activity.currency || 'EUR';
      const rate = rates[currency];
      
      if (rate) {
        total += activity.cost / rate;
      } else {
        total += activity.cost; // Assume same currency if unknown
      }
    }
  }
  
  return total;
}
