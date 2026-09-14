import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Клиент работает со схемой legal (наши таблицы юрлиц).
// Сессия хранится в браузере, RLS пускает только после входа.
export const supabase = createClient(url, anon, {
  db: { schema: "legal" },
  auth: { persistSession: true, autoRefreshToken: true },
});

// Отдельный клиент на public не нужен — всё в legal.
