export function getFunctionsBaseUrl(): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const m = base?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  const ref = m ? m[1] : "";
  return `https://${ref}.functions.supabase.co`;
}

async function safeFetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || text;
    const err: any = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export async function adminAction(
  action: "delete_document"|"restore_document"|"delete_regulation"|"restore_regulation",
  id: string
) {
  const fn = `${getFunctionsBaseUrl()}/reggio-admin`;
  return safeFetchJson(fn, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, id })
  });
}
