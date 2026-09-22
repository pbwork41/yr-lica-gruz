import { createClient } from "@supabase/supabase-js";
import { buildInvoice } from "../../../lib/pdf/invoice";
import { buildAct } from "../../../lib/pdf/act";
import { buildUpd } from "../../../lib/pdf/upd";
import { fmtDateRu } from "../../../lib/pdf/helpers";

export const runtime = "nodejs";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { db: { schema: "legal" }, auth: { persistSession: false } }
  );
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { order_id, type, withSign, token } = body; // type: invoice|act|upd

    // клиент с токеном пользователя (для RLS)
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { db: { schema: "legal" }, global: { headers: token ? { Authorization: `Bearer ${token}` } : {} }, auth: { persistSession: false } }
    );

    // грузим заявку, контрагента, настройки
    const [{ data: order }, { data: org }] = await Promise.all([
      sb.from("orders").select("*").eq("id", order_id).single(),
      sb.from("org_settings").select("*").eq("id", 1).single(),
    ]);
    if (!order) return new Response(JSON.stringify({ error: "Заявка не найдена" }), { status: 404 });
    const { data: cp } = await sb.from("counterparties").select("*").eq("id", order.counterparty_id).single();

    // номер: берём next_doc_number, если у заявки ещё нет — присваиваем и инкрементим
    let number = order.invoice_number;
    if (!number) {
      number = String(org.next_doc_number || 178);
      await sb.from("orders").update({ invoice_number: number }).eq("id", order_id);
      await sb.from("org_settings").update({ next_doc_number: (org.next_doc_number || 178) + 1 }).eq("id", 1);
    }

    const today = new Date().toISOString().slice(0, 10);
    const dateRu = fmtDateRu(today);
    const [yy, mm2, dd] = today.split("-");
    const dateShort = `${dd}.${mm2}.${yy}`;

    const orgData = {
      short_name: org.short_name, name: org.short_name, inn: org.inn,
      legal_address: org.legal_address, bank_name: org.bank_name, bank_bik: org.bank_bik,
      bank_account: org.bank_account, corr_account: org.corr_account,
      ogrnip_line: org.ogrnip ? `ОГРНИП ${org.ogrnip}` : "",
    };
    const client = {
      name: cp?.name || "", inn: cp?.inn || "", kpp: cp?.kpp || "", address: cp?.legal_address || "",
    };
    const item = { name: "Погрузочно-разгрузочные работы", total: Number(order.revenue) || 0 };
    const vatMode = cp?.vat_mode || "included";
    const d = { number, date: dateRu, dateShort, status: "1", shipDate: `« ${dd} »  ${["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"][parseInt(mm2)-1]}  ${yy} года` };

    // имя контрагента для названия файла (без ООО/кавычек и лишних символов)
    const cpName = (cp?.name || "")
      .replace(/^(ООО|ОАО|ЗАО|ПАО|АО|ИП)\s+/i, "")
      .replace(/["«»']/g, "")
      .replace(/[\\/:*?<>|]/g, "")
      .trim();

    let buf, docTitle;
    if (type === "invoice") {
      buf = await buildInvoice({ org: orgData, client, doc: d, item, vatMode, withSign });
      docTitle = "Счёт";
    } else if (type === "act") {
      buf = await buildAct({ org: orgData, client, doc: d, item, vatMode, withSign });
      docTitle = "Акт";
    } else if (type === "upd") {
      item.name = "Погрузочно-разгрузочные услуги";
      buf = await buildUpd({ org: orgData, client, doc: d, item, vatMode, withSign, basis: cp?.contract_basis || "" });
      docTitle = "УПД";
    } else {
      return new Response(JSON.stringify({ error: "Неизвестный тип" }), { status: 400 });
    }
    // напр. "Счёт КДВ Групп №178.pdf"
    const filename = `${docTitle}${cpName ? " " + cpName : ""} №${number}.pdf`;

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 500 });
  }
}
