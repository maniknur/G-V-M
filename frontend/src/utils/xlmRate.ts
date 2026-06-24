const CACHE_KEY = "gvm_xlm_rate";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const USDC_ISSUER = "CDLZFC3SYJYDZT7K67VZ67QJ6RY6UTJGNHFYK4BWHPFHEQ2SL3TKSYNJ";

const RATE_FALLBACK = 3.0; // fallback: 1 USDC ≈ 3 XLM

interface RateCache {
  rate: number;
  fetchedAt: number;
}

function readCache(): RateCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as RateCache;
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function writeCache(rate: number): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rate, fetchedAt: Date.now() }),
    );
  } catch {
    // localStorage full or disabled — silent fail
  }
}

interface PriceR {
  n: number;
  d: number;
}

interface OrderBookLevel {
  price_r?: PriceR;
}

interface OrderBookResponse {
  bids?: OrderBookLevel[];
  asks?: OrderBookLevel[];
}

/**
 * Fetch the current USDC→XLM market rate from the Stellar DEX order book.
 * Returns the mid-price between best bid and ask. Falls back to cache or
 * default rate on failure.
 */
export async function getXlmMarketRate(): Promise<number> {
  const cached: RateCache | null = readCache();
  if (cached) return cached.rate;

  const fallback = RATE_FALLBACK;

  try {
    const params = new URLSearchParams({
      selling_asset_type: "credit_alphanum4",
      selling_asset_code: "TUSDC",
      selling_asset_issuer: USDC_ISSUER,
      buying_asset_type: "native",
    });

    const res = await fetch(`${HORIZON_URL}/order_book?${params}`);

    if (!res.ok) {
      throw new Error(`Horizon returned ${res.status}`);
    }

    const data: OrderBookResponse = await res.json();

    const bestBid: PriceR | undefined = data.bids?.[0]?.price_r;
    const bestAsk: PriceR | undefined = data.asks?.[0]?.price_r;

    if (bestBid || bestAsk) {
      const bidN = bestBid ? bestBid.n / bestBid.d : 0;
      const askN = bestAsk ? bestAsk.n / bestAsk.d : 0;

      let rate: number;
      if (bidN > 0 && askN > 0) {
        rate = (bidN + askN) / 2;
      } else if (bidN > 0) {
        rate = bidN;
      } else if (askN > 0) {
        rate = askN;
      } else {
        rate = fallback;
      }

      writeCache(rate);
      return rate;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Convert a USDC amount to its estimated XLM equivalent.
 * @param usdcAmount — amount in USDC
 * @param rate — optional pre-fetched rate, fetches automatically if omitted
 */
export async function convertUsdcToXlm(
  usdcAmount: number,
  rate?: number,
): Promise<number | null> {
  try {
    const r = rate ?? (await getXlmMarketRate());
    return Number((usdcAmount * r).toFixed(2));
  } catch {
    return null;
  }
}

import { useState, useEffect } from "react";

/**
 * React hook that fetches and caches the USDC→XLM rate.
 * Re-fetches only when the cache expires (5 min).
 */
export function useXlmRate() {
  const [rate, setRate] = useState<number>(RATE_FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = await getXlmMarketRate();
      if (!cancelled) {
        setRate(r);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rate, loading };
}
