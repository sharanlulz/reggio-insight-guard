// src/lib/supaRetry.ts
export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      // short pause on retries
      if (i > 0) await new Promise(r => setTimeout(r, 400 * i));
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message || e);
      // Retry only on network/timeouts
      if (!/timeout|terminated|fetch failed|network/i.test(msg)) throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

// AbortController-based fetch timeout (for function calls)
export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}
