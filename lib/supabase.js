import { createClient } from "@supabase/supabase-js";

// Ленивое создание клиента: не падаем при сборке, если переменных ещё нет.
let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase env not set");
  }
  _client = createClient(url, anon, {
    db: { schema: "legal" },
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}

// Прокси для совместимости: supabase.auth..., supabase.from(...)
export const supabase = new Proxy({}, {
  get(_t, prop) {
    const c = getSupabase();
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});
