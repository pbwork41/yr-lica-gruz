import { createClient } from "@supabase/supabase-js";
import { tgSend, tgSendDocument, tgAnswerCallback, tgEditText, inlineKb } from "../../../lib/telegram";
import { buildInvoice } from "../../../lib/pdf/invoice";
import { buildAct } from "../../../lib/pdf/act";
import { buildUpd } from "../../../lib/pdf/upd";
import { calcOrderJs } from "../../../lib/calcServer";
import { fmtDateRu } from "../../../lib/pdf/helpers";
import { transcribe, parseIntent } from "../../../lib/voice";
import { parseCompanyText, parseCompanyImage, tgFileToDataUrl } from "../../../lib/company";

export const runtime = "nodejs";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

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
      // продолжение разговорного диалога (nl)
      if (data.startsWith("nlcp:")) {
        const draft = { ...(sess.draft || {}), counterparty_id: data.slice(5), counterparty_name: null };
        await handleNL(db, chatId, "", { step: "nl", draft });
        return ok();
      }
      if (data.startsWith("nlwork:")) {
        const draft = { ...(sess.draft || {}), work_type: data.slice(7) };
        await handleNL(db, chatId, "", { step: "nl", draft });
        return ok();
      }
      if (data.startsWith("nlpay:")) {
        const draft = { ...(sess.draft || {}), payment_method: data.slice(6) };
        await handleNL(db, chatId, "", { step: "nl", draft });
        return ok();
      }
      // карточка компании
      // прикрепить реквизиты к выбранному контрагенту — показать список
      if (data === "co:attach") {
        const { data: cps } = await db.from("counterparties").select("id,name,inn").eq("is_active", true).order("name").limit(30);
        if (!cps || !cps.length) { await tgSend(TOKEN, chatId, "Нет контрагентов для привязки."); return ok(); }
        await tgSend(TOKEN, chatId, "К какому контрагенту прикрепить реквизиты?",
          inlineKb(cps.map((c) => [{ text: c.name + (c.inn ? ` (${c.inn})` : ""), data: `coatt:${c.id}` }])));
        return ok();
      }
      // прикрепить к конкретному
      if (data.startsWith("coatt:")) {
        const targetId = data.slice(6);
        const cp = (sess.draft && sess.draft.cp) || {};
        const patch = {};
        for (const k of ["name","inn","kpp","legal_address","bank_name","bank_account","corr_account","bank_bik","contact_person","contact_phone","contact_email"]) {
          if (cp[k]) patch[k] = cp[k];
        }
        // при привязке к существующему НЕ перезаписываем название (оставляем как у него), только реквизиты
        delete patch.name;
        const { data: target, error } = await db.from("counterparties").update(patch).eq("id", targetId).select("name").single();
        await clearSession(db, chatId);
        if (error) { await tgSend(TOKEN, chatId, "Ошибка: " + error.message); return ok(); }
        await tgSend(TOKEN, chatId, `📎 Реквизиты прикреплены к «${target?.name || ""}».\nНазвание и ставки не тронуты.`);
        return ok();
      }
      if (data === "co:create" || data === "co:update" || data === "co:cancel") {
        const d = sess.draft || {};
        if (data === "co:cancel") {
          await clearSession(db, chatId);
          await tgSend(TOKEN, chatId, "Отменено.");
          return ok();
        }
        const cp = d.cp || {};
        if (data === "co:update" && d.existing_id) {
          // обновляем только непустые поля, ставки не трогаем
          const patch = {};
          for (const k of ["name","inn","kpp","legal_address","bank_name","bank_account","corr_account","bank_bik","contact_person","contact_phone","contact_email"]) {
            if (cp[k]) patch[k] = cp[k];
          }
          const { error } = await db.from("counterparties").update(patch).eq("id", d.existing_id);
          await clearSession(db, chatId);
          if (error) { await tgSend(TOKEN, chatId, "Ошибка обновления: " + error.message); return ok(); }
          await tgSend(TOKEN, chatId, `🔄 Реквизиты «${cp.name}» обновлены.\nСтавки не тронуты — задайте на сайте, если нужно.`);
          return ok();
        }
        // создать нового
        const { error } = await db.from("counterparties").insert({ ...cp, is_active: true, vat_mode: "included" });
        await clearSession(db, chatId);
        if (error) { await tgSend(TOKEN, chatId, "Ошибка создания: " + error.message); return ok(); }
        await tgSend(TOKEN, chatId, `✅ Контрагент «${cp.name}» добавлен.\nСтавки (час, контейнер 20/40) задайте на сайте или скажите мне.`);
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

    // ── Карточка компании: фото / документ / пересланный текст с реквизитами ──
    const photo = msg.photo ? msg.photo[msg.photo.length - 1] : null; // самое большое фото
    const docFile = msg.document; // файл-документ
    const isImageDoc = docFile && /image\//.test(docFile.mime_type || "");
    if (photo || isImageDoc) {
      if (!OPENAI_KEY) { await tgSend(TOKEN, chatId, "Распознавание не настроено (нет ключа)."); return ok(); }
      await tgSend(TOKEN, chatId, "📇 Разбираю карточку компании…");
      try {
        const fileId = photo ? photo.file_id : docFile.file_id;
        const mime = photo ? "image/jpeg" : (docFile.mime_type || "image/jpeg");
        const dataUrl = await tgFileToDataUrl(TOKEN, fileId, mime);
        const fields = await parseCompanyImage(dataUrl, OPENAI_KEY);
        await handleCompany(db, chatId, fields);
      } catch (e) {
        await tgSend(TOKEN, chatId, "Ошибка разбора карточки: " + e.message);
      }
      return ok();
    }
    // Текстовая карточка: длинный текст с ИНН — трактуем как реквизиты
    if (text && /\bИНН\b/i.test(text) && /\d{10,12}/.test(text) && text.length > 40 && !text.startsWith("/")) {
      if (!OPENAI_KEY) { await tgSend(TOKEN, chatId, "Распознавание не настроено (нет ключа)."); return ok(); }
      await tgSend(TOKEN, chatId, "📇 Разбираю реквизиты…");
      try {
        const fields = await parseCompanyText(text, OPENAI_KEY);
        await handleCompany(db, chatId, fields);
      } catch (e) {
        await tgSend(TOKEN, chatId, "Ошибка разбора: " + e.message);
      }
      return ok();
    }

    // ── Голосовое или разговорный текст → разбор через GPT ──
    // голос: распознаём в текст
    let nlText = null;
    if (msg.voice || msg.audio) {
      if (!OPENAI_KEY) { await tgSend(TOKEN, chatId, "Распознавание не настроено (нет ключа)."); return ok(); }
      await tgSend(TOKEN, chatId, "🎧 Распознаю…");
      try {
        nlText = await transcribe(TOKEN, (msg.voice || msg.audio).file_id, OPENAI_KEY);
      } catch (e) { await tgSend(TOKEN, chatId, "Ошибка распознавания: " + e.message); return ok(); }
      if (!nlText.trim()) { await tgSend(TOKEN, chatId, "Не расслышал. Повторите."); return ok(); }
    } else if (sess.step === "nl" && text && !text.startsWith("/")) {
      // мы в разговорном диалоге — обычный текст трактуем как ответ
      nlText = text;
    } else if (OPENAI_KEY && text && !text.startsWith("/") && sess.step !== "revenue" && sess.step !== "payout" &&
               /(счёт|счет|акт|упд|заявк|контейнер|сделай|выстав)/i.test(text)) {
      // свободный текст с признаками заявки — тоже в разговорный режим
      nlText = text;
    }

    if (nlText) {
      await handleNL(db, chatId, nlText, sess);
      return ok();
    }

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
        "Просто скажите или напишите, что нужно:\n" +
        "🎤 «Сделай счёт на КДВ на шестнадцать пятьсот»\n" +
        "🎤 «Заявка на Все Краски, контейнер 40, 14000, выплата 7000, безнал»\n\n" +
        "Чего не хватит — спрошу. Отвечать можно голосом или текстом.\n\n" +
        "📇 Пришлите карточку компании (фото, PDF-скан или текст с реквизитами) — добавлю контрагента сам.\n\n" +
        "Ещё: /zayavka — по шагам, /dolgi — долги, /svodka — сводка.");
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

// ── Разговорный диалог: разбор, доспрос недостающего, создание + документы ──
// ── Карточка компании: проверка по ИНН, создание/обновление ──
async function handleCompany(db, chatId, f) {
  if (!f || !f.name) {
    await tgSend(TOKEN, chatId, "Не смог распознать реквизиты. Пришлите карточку почётче или добавьте контрагента на сайте.");
    return;
  }
  const clean = (v) => (v == null ? null : String(v).replace(/\s/g, "") || null);
  const cp = {
    name: f.name.trim(),
    inn: clean(f.inn), kpp: clean(f.kpp),
    legal_address: f.legal_address || null,
    bank_name: f.bank_name || null,
    bank_account: clean(f.bank_account),
    corr_account: clean(f.corr_account),
    bank_bik: clean(f.bank_bik),
    contact_person: f.contact_person || null,
    contact_phone: f.contact_phone || null,
    contact_email: f.contact_email || null,
  };

  // ищем по ИНН
  let existing = null;
  if (cp.inn) {
    const { data } = await db.from("counterparties").select("id,name,inn").eq("inn", cp.inn).maybeSingle();
    existing = data || null;
  }

  // сохраняем разобранное в сессию для подтверждения
  await setSession(db, chatId, "company_confirm", { cp, existing_id: existing?.id || null });

  let out = "📇 Распознал реквизиты:\n";
  out += `• Название: <b>${cp.name}</b>\n`;
  if (cp.inn) out += `• ИНН: ${cp.inn}\n`;
  if (cp.kpp) out += `• КПП: ${cp.kpp}\n`;
  if (cp.legal_address) out += `• Адрес: ${cp.legal_address}\n`;
  if (cp.bank_name) out += `• Банк: ${cp.bank_name}\n`;
  if (cp.bank_account) out += `• Р/с: ${cp.bank_account}\n`;
  if (cp.bank_bik) out += `• БИК: ${cp.bank_bik}\n`;

  if (existing) {
    out += `\n⚠️ Контрагент с таким ИНН уже есть: <b>${existing.name}</b>`;
    await tgSend(TOKEN, chatId, out, inlineKb([
      [{ text: "🔄 Обновить реквизиты", data: "co:update" }],
      [{ text: "📎 Прикрепить к другому", data: "co:attach" }],
      [{ text: "➕ Создать нового", data: "co:create" }, { text: "❌ Отмена", data: "co:cancel" }],
    ]));
  } else {
    out += `\nСоздать контрагента?`;
    await tgSend(TOKEN, chatId, out, inlineKb([
      [{ text: "✅ Создать нового", data: "co:create" }],
      [{ text: "📎 Прикрепить к действующему", data: "co:attach" }],
      [{ text: "❌ Отмена", data: "co:cancel" }],
    ]));
  }
}

async function handleNL(db, chatId, nlText, sess) {
  const { data: cps } = await db.from("counterparties").select("id,name").eq("is_active", true);
  const known = (sess.draft && sess.step === "nl") ? sess.draft : {};
  let parsed;
  if (nlText && nlText.trim()) {
    try {
      parsed = await parseIntent(nlText, cps || [], known, OPENAI_KEY);
    } catch (e) {
      await tgSend(TOKEN, chatId, "Не смог разобрать: " + e.message);
      return;
    }
  } else {
    // пустой ввод (после кнопки) — работаем с уже известным
    parsed = { ...known, documents: known.documents || [] };
  }

  // накопленный черновик
  const draft = {
    counterparty_id: parsed.counterparty_id || known.counterparty_id || null,
    counterparty_name: parsed.counterparty_name || known.counterparty_name || null,
    work_type: parsed.work_type || known.work_type || null,
    revenue: parsed.revenue != null ? parsed.revenue : (known.revenue ?? null),
    payout: parsed.payout != null ? parsed.payout : (known.payout ?? null),
    payment_method: parsed.payment_method || known.payment_method || null,
    documents: (parsed.documents && parsed.documents.length) ? parsed.documents : (known.documents || []),
  };

  // чего не хватает (для полной заявки нужны все поля)
  const ask = (field, question, kb) => { setSession(db, chatId, "nl", draft); return tgSend(TOKEN, chatId, question, kb); };

  if (!draft.counterparty_id) {
    if (draft.counterparty_name) {
      // назвали, но не нашли — предложим список
      await setSession(db, chatId, "nl", draft);
      await tgSend(TOKEN, chatId, `Не нашёл «${draft.counterparty_name}». Выберите контрагента:`,
        inlineKb((cps || []).map((c) => [{ text: c.name, data: `nlcp:${c.id}` }])));
    } else {
      await setSession(db, chatId, "nl", draft);
      await tgSend(TOKEN, chatId, "Для кого заявка? Выберите контрагента:",
        inlineKb((cps || []).map((c) => [{ text: c.name, data: `nlcp:${c.id}` }])));
    }
    return;
  }
  const cpName = (cps.find((c) => c.id === draft.counterparty_id) || {}).name || "";
  if (!draft.work_type) {
    await setSession(db, chatId, "nl", draft);
    await tgSend(TOKEN, chatId, `${cpName}. Вид работ?`, inlineKb([
      [{ text: "Контейнер 20", data: "nlwork:container_20" }, { text: "Контейнер 40", data: "nlwork:container_40" }],
      [{ text: "Почасовые", data: "nlwork:hourly" }, { text: "Склад", data: "nlwork:warehouse" }],
    ]));
    return;
  }
  if (draft.revenue == null) {
    await setSession(db, chatId, "nl", draft);
    await tgSend(TOKEN, chatId, "На какую сумму? (₽) — скажите или напишите число.");
    return;
  }
  if (draft.payout == null) {
    await setSession(db, chatId, "nl", draft);
    await tgSend(TOKEN, chatId, "Выплата исполнителям? (₽) — число, или скажите «ноль».");
    return;
  }
  if (!draft.payment_method) {
    await setSession(db, chatId, "nl", draft);
    await tgSend(TOKEN, chatId, "Форма расчёта?", inlineKb([[{ text: "Безнал", data: "nlpay:cashless" }, { text: "Наличные", data: "nlpay:cash" }]]));
    return;
  }

  // всё есть — создаём заявку и выдаём документы (если просили)
  await finalizeNL(db, chatId, draft);
}

async function finalizeNL(db, chatId, draft) {
  const orderId = await createOrder(db, chatId, draft, true);
  if (!orderId) return;
  const docs = draft.documents || [];
  if (docs.length) {
    await tgSend(TOKEN, chatId, "Формирую документы…");
    for (const t of docs) {
      try { await sendDoc(db, chatId, orderId, t, true); } catch (e) { await tgSend(TOKEN, chatId, "Ошибка документа: " + e.message); }
    }
  }
}

async function createOrder(db, chatId, draft, silentDocsKb) {
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
