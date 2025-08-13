// src/lib/supaRetry.ts

/**
 * Exponential backoff with jitter, retrying only on transient network-ish errors.
 * Works with any async function, including Supabase queries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: {
    tries?: number;          // max attempts
    baseDelayMs?: number;    // initial delay (exponential)
    maxDelayMs?: number;     // cap
    retryOn?: RegExp;        // which error messages are retryable
  } = {}
): Promise<T> {
  const {
    tries = 3,
    baseDelayMs = 400,
    maxDelayMs = 5000,
    retryOn = /(timeout|terminated|fetch failed|network|ECONN|504|Connection closed)/i,
  } = opts;

  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message || e);
      // If it doesn't look transient, fail fast
      if (!retryOn.test(msg)) throw e;

      lastErr = e;
      if (i < tries - 1) {
        // expo backoff + jitter
        const backoff = Math.min(baseDelayMs * 2 ** i, maxDelayMs);
        const jitter = Math.floor(Math.random() * 250);
        await new Promise((r) => setTimeout(r, backoff + jitter));
      }
    }
  }
  throw lastErr;
}

/**
 * fetch() with an AbortController timeout.
 * Useful for calling edge functions so the UI doesn't hang forever.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  ms = 15000
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
