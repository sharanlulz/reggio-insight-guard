// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
// If you later generate a typed file for your DB, re-add: import type { Database } from "./types";

const SUPABASE_URL = "https://plktjrbfnzyelwkyyssz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa3RqcmJmbnp5ZWx3a3l5c3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NDg1ODEsImV4cCI6MjA3MDQyNDU4MX0.od0uTP1PV4iALtJLB79fOCZ5g7ACJew0FzL5CJlzZ20";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
