import { createClient } from "@supabase/supabase-js";
import { tgSend, tgSendDocument, tgAnswerCallback, tgEditText, inlineKb } from "../../../lib/telegram";
import { buildInvoice } from "../../../lib/pdf/invoice";
import { buildAct } from "../../../lib/pdf/act";
import { buildUpd } from "../../../lib/pdf/upd";
import { calcOrderJs } from "../../../lib/calcServer";
import { fmtDateRu } from "../../../lib/pdf/helpers";

export const runtime = "nodejs";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { db: { schema: "legal" }, auth: { persistSession: false } }
  );
}

const WORK_TYPES = {
  container_20: "Контейнер 20 фут",
  container_40: "Контейнер 40 фут",
  hourly: "Почасовые работы",
  warehouse: "Работа на складе",
};

const rub = (n) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " ₽";

async function isAllowed(db, chatId) {
  const { data } = await db.from("tg_allowed").select("chat_id").eq("chat_id", chatId).maybeSingle();
  return !!data;
}

async function getSession(db, chatId) {
  const { data } = await db.from("tg_sessions").select("*").eq("chat_id", chatId).maybeSingle();
  return data || { chat_id: chatId, step: null, draft: {} };
}
async function setSession(db, chatId, step, draft) {
  await db.from("tg_sessions").upsert({ chat_id: chatId, step, draft, updated_at: new Date().toISOString() });
}
async function clearSession(db, chatId) {
  await db.from("tg_sessions").delete().eq("chat_id", chatId);
}

// ── Генерация и отправка документа ──
async function sendDoc(db, chatId, orderId, type, withSign) {
  const [{ data: order }, { data: org }] = await Promise.all([
    db.from("orders").select("*").eq("id", orderId).single(),
    db.from("org_settings").select("*").eq("id", 1).single(),
  ]);
  const { data: cp } = await db.from("counterparties").select("*").eq("id", order.counterparty_id).single();

  let number = order.invoice_number;
  if (!number) {
    number = String(org.next_doc_number || 178);
    await db.from("orders").update({ invoice_number: number }).eq("id", orderId);
    await db.from("org_settings").update({ next_doc_number: (org.next_doc_number || 178) + 1 }).eq("id", 1);
  }
  const today = new Date().toISOString().slice(0, 10);
  const [yy, mm, dd] = today.split("-");
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const orgData = {
    short_name: org.short_name, name: org.short_name, inn: org.inn, legal_address: org.legal_address,
    bank_name: org.bank_name, bank_bik: org.bank_bik, bank_account: org.bank_account, corr_account: org.corr_account,
    ogrnip_line: org.ogrnip ? `ОГРНИП ${org.ogrnip}` : "",
  };
  const client = { name: cp?.name || "", inn: cp?.inn || "", kpp: cp?.kpp || "", address: cp?.legal_address || "" };
  const item = { name: "Погрузочно-разгрузочные работы", total: Number(order.revenue) || 0 };
  const vatMode = cp?.vat_mode || "included";
  const d = { number, date: fmtDateRu(today), dateShort: `${dd}.${mm}.${yy}`, status: "1",
    shipDate: `« ${dd} »  ${months[parseInt(mm)-1]}  ${yy} года` };

  const cpName = (cp?.name || "").replace(/^(ООО|ОАО|ЗАО|ПАО|АО|ИП)\s+/i, "").replace(/["«»']/g, "").replace(/[\\/:*?<>|]/g, "").trim();
  let buf, title;
  if (type === "invoice") { buf = await buildInvoice({ org: orgData, client, doc: d, item, vatMode, withSign }); title = "Счёт"; }
  else if (type === "act") { buf = await buildAct({ org: orgData, client, doc: d, item, vatMode, withSign }); title = "Акт"; }
  else { item.name = "Погрузочно-разгрузочные услуги"; buf = await buildUpd({ org: orgData, client, doc: d, item, vatMode, withSign, basis: cp?.contract_basis || "" }); title = "УПД"; }
  const filename = `${title}${cpName ? " " + cpName : ""} №${number}.pdf`;
  await tgSendDocument(TOKEN, chatId, filename, buf);
  return number;
}

const docsKb = (orderId) => inlineKb([
  [{ text: "📄 Счёт", data: `doc:invoice:${orderId}` }, { text: "📄 Акт", data: `doc:act:${orderId}` }, { text: "📄 УПД", data: `doc:upd:${orderId}` }],
  [{ text: "📎 Всё (с подписью)", data: `doc:all:${orderId}` }],
]);

export async function POST(req) {
  try {
    const update = await req.json();
    const db = sb();

    // ── Callback (нажатие кнопки) ──
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data || "";
      await tgAnswerCallback(TOKEN, cq.id);
      if (!(await isAllowed(db, chatId))) return ok();

      const sess = await getSession(db, chatId);

      // выбор в диалоге создания заявки
      if (data.startsWith("cp:")) {
        const cpId = data.slice(3);
        const draft = { ...sess.draft, counterparty_id: cpId };
        await setSession(db, chatId, "work", draft);
        await tgSend(TOKEN, chatId, "Вид работ?", inlineKb([
          [{ text: "Контейнер 20", data: "work:container_20" }, { text: "Контейнер 40", data: "work:container_40" }],
          [{ text: "Почасовые", data: "work:hourly" }, { text: "Склад", data: "work:warehouse" }],
        ]));
        return ok();
      }
      if (data.startsWith("work:")) {
        const wt = data.slice(5);
        const draft = { ...sess.draft, work_type: wt };
        await setSession(db, chatId, "revenue", draft);
        await tgSend(TOKEN, chatId, "Сумма от клиента? (₽)\nПришлите число.");
        return ok();
      }
      if (data.startsWith("pay:")) {
        const pm = data.slice(4);
        const draft = { ...sess.draft, payment_method: pm };
        // создаём заявку
        const orderId = await createOrder(db, chatId, draft);
        return ok();
      }
      // документы
      if (data.startsWith("doc:")) {
        const [, type, orderId] = data.split(":");
        if (type === "all") {
          for (const t of ["invoice", "act", "upd"]) await sendDoc(db, chatId, orderId, t, true);
        } else {
          await sendDoc(db, chatId, orderId, type, true);
        }
        return ok();
      }
      if (data.startsWith("paid:")) {
        const orderId = data.slice(5);
        await db.from("orders").update({ is_paid: true, paid_date: new Date().toISOString().slice(0, 10) }).eq("id", orderId);
        await tgSend(TOKEN, chatId, "✅ Отмечено оплаченным.");
        return ok();
      }
      return ok();
    }

    // ── Сообщение ──
    const msg = update.message;
    if (!msg) return ok();
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    // /id — узнать chat_id (работает всегда, для настройки)
    if (text === "/id") {
      await tgSend(TOKEN, chatId, `chat_id: <code>${chatId}</code>`);
      return ok();
    }
    if (!(await isAllowed(db, chatId))) {
      await tgSend(TOKEN, chatId, `Доступ не настроен. Ваш chat_id: <code>${chatId}</code>\nДобавьте его в разрешённые.`);
      return ok();
    }

    const sess = await getSession(db, chatId);

    // ожидаем ввод суммы?
    if (sess.step === "revenue" && /^\d[\d\s]*$/.test(text)) {
      const revenue = parseInt(text.replace(/\s/g, ""), 10);
      const draft = { ...sess.draft, revenue };
      await setSession(db, chatId, "payout", draft);
      await tgSend(TOKEN, chatId, "Выплата исполнителям? (₽)\nПришлите число или 0.");
      return ok();
    }
    if (sess.step === "payout" && /^\d[\d\s]*$/.test(text)) {
      const payout = parseInt(text.replace(/\s/g, ""), 10);
      const draft = { ...sess.draft, payout };
      await setSession(db, chatId, "payment", draft);
      await tgSend(TOKEN, chatId, "Форма расчёта?", inlineKb([
        [{ text: "Безнал", data: "pay:cashless" }, { text: "Наличные", data: "pay:cash" }],
      ]));
      return ok();
    }

    // Команды
    if (text === "/start" || text === "/help") {
      await tgSend(TOKEN, chatId,
        "<b>Профинайм · Юрлица</b>\n\n" +
        "/zayavka — создать заявку\n" +
        "/dolgi — неоплаченные\n" +
        "/svodka — сводка за неделю\n\n" +
        "Заявка создаётся по шагам с кнопками.");
      return ok();
    }
    if (text === "/zayavka" || text === "/заявка") {
      const { data: cps } = await db.from("counterparties").select("id,name").eq("is_active", true).order("name").limit(20);
      if (!cps || !cps.length) { await tgSend(TOKEN, chatId, "Нет контрагентов. Добавьте на сайте."); return ok(); }
      await setSession(db, chatId, "cp", {});
      const rows = cps.map((c) => [{ text: c.name, data: `cp:${c.id}` }]);
      await tgSend(TOKEN, chatId, "Контрагент?", inlineKb(rows));
      return ok();
    }
    if (text === "/dolgi" || text === "/долги") {
      const { data: rows } = await db.from("orders").select("*, counterparties(name)").eq("is_paid", false).order("order_date");
      if (!rows || !rows.length) { await tgSend(TOKEN, chatId, "Долгов нет 👍"); return ok(); }
      let total = 0;
      let out = "<b>Неоплаченные:</b>\n";
      rows.forEach((r) => { total += Number(r.revenue) || 0; out += `• ${r.counterparties?.name || "?"} — ${rub(r.revenue)}${r.invoice_number ? " (№" + r.invoice_number + ")" : ""}\n`; });
      out += `\n<b>Итого: ${rub(total)}</b>`;
      await tgSend(TOKEN, chatId, out);
      return ok();
    }
    if (text === "/svodka" || text === "/сводка") {
      const now = new Date();
      const day = (now.getDay() + 6) % 7;
      const mon = new Date(now); mon.setDate(now.getDate() - day);
      const from = mon.toISOString().slice(0, 10);
      const to = now.toISOString().slice(0, 10);
      const { data: rows } = await db.from("orders").select("*, counterparties(vat_mode)").eq("is_paid", true).gte("paid_date", from).lte("paid_date", to);
      let net = 0, revenue = 0;
      (rows || []).forEach((r) => {
        const c = calcOrderJs({ ...r, vat_mode: r.counterparties?.vat_mode });
        net += c.net; revenue += Number(r.revenue) || 0;
      });
      await tgSend(TOKEN, chatId,
        `<b>Сводка с ${from}</b>\nПришло: ${rub(revenue)}\nЧистая: ${rub(net)}\nПартнёр 60%: ${rub(net*0.6)}\nПартнёр 40%: ${rub(net*0.4)}`);
      return ok();
    }

    await tgSend(TOKEN, chatId, "Не понял. /zayavka — создать заявку, /help — команды.");
    return ok();
  } catch (e) {
    return new Response("err: " + e.message, { status: 200 });
  }
}

async function createOrder(db, chatId, draft) {
  const payload = {
    order_date: new Date().toISOString().slice(0, 10),
    counterparty_id: draft.counterparty_id,
    work_type: draft.work_type,
    revenue: draft.revenue || 0,
    payout: draft.payout || 0,
    payment_method: draft.payment_method || "cashless",
    is_paid: false,
    calc_smz_service: draft.payment_method === "cashless",
    calc_smz_tax: draft.payment_method === "cashless",
    calc_logist: true,
    calc_ads: true,
  };
  const { data: order, error } = await db.from("orders").insert(payload).select("*, counterparties(name)").single();
  await clearSession(db, chatId);
  if (error) { await tgSend(TOKEN, chatId, "Ошибка создания: " + error.message); return null; }

  const c = calcOrderJs({ ...order, vat_mode: null });
  const wt = WORK_TYPES[order.work_type] || order.work_type;
  await tgSend(TOKEN, chatId,
    `✅ <b>Заявка создана</b>\n${order.counterparties?.name} · ${wt} · ${rub(order.revenue)}\n` +
    `Чистая: ${rub(c.net)} · Партнёр 60/40: ${rub(c.owner)} / ${rub(c.partner)}`,
    docsKb(order.id));
  return order.id;
}

function ok() { return new Response("ok", { status: 200 }); }
