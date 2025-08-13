// Build the correct Functions base URL from your project URL
export function getFunctionsBaseUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  const m = base?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  const ref = m ? m[1] : "";
  return `https://${ref}.functions.supabase.co`;
}
