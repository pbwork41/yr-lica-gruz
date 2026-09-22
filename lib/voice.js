// Распознавание голоса (Whisper) + разговорный разбор в заявку (GPT)
const OPENAI = "https://api.openai.com/v1";

// Скачать голосовое из Telegram и распознать через Whisper
export async function transcribe(token, fileId, openaiKey) {
  const fr = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const fj = await fr.json();
  if (!fj.ok) throw new Error("Не удалось получить файл");
  const filePath = fj.result.file_path;
  const audioRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  const audioBuf = Buffer.from(await audioRes.arrayBuffer());
  const form = new FormData();
  form.append("file", new Blob([audioBuf], { type: "audio/ogg" }), "voice.ogg");
  form.append("model", "whisper-1");
  form.append("language", "ru");
  const wr = await fetch(`${OPENAI}/audio/transcriptions`, {
    method: "POST", headers: { Authorization: `Bearer ${openaiKey}` }, body: form,
  });
  const wj = await wr.json();
  if (wj.error) throw new Error("Whisper: " + wj.error.message);
  return wj.text || "";
}

// Разговорный разбор: намерение + поля + тип документа.
// known — уже собранные поля (для продолжения диалога).
export async function parseIntent(text, cps, known, openaiKey) {
  const cpList = cps.map((c) => c.name).join("; ");
  const knownStr = JSON.stringify(known || {});
  const sys = `Ты ассистент для заявок грузоперевозок. Разбери фразу пользователя и верни СТРОГО JSON.
Уже известно (не теряй эти значения, дополняй): ${knownStr}
Список контрагентов: ${cpList}

Верни JSON:
{
 "counterparty": "точное название из списка или null",
 "work_type": "container_20|container_40|hourly|warehouse|null",
 "revenue": число или null,
 "payout": число или null,
 "payment_method": "cashless|cash|null",
 "documents": ["invoice"|"act"|"upd"] или [],   // какие документы просит: счёт->invoice, акт->act, упд->upd, "документы/всё"->все три
 "answer_to": "поле, на которое пользователь сейчас отвечает, если это ответ на вопрос (counterparty|work_type|revenue|payout|payment_method) или null"
}
Правила:
- "сделай счёт"->documents:["invoice"], "акт"->["act"], "упд"->["upd"], "все документы"->["invoice","act","upd"]
- числа словами: "шестнадцать пятьсот"->16500, "восемь тысяч"->8000, "шестнадцать тысяч пятьсот"->16500
- контрагента сопоставь по смыслу даже при неточном произношении
- если пользователь отвечает одним числом на вопрос о сумме/выплате — заполни соответствующее поле
- сохраняй уже известные значения, не обнуляй их
Только JSON, без пояснений.`;

  const r = await fetch(`${OPENAI}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: sys }, { role: "user", content: text }],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error("GPT: " + j.error.message);
  let p = {};
  try { p = JSON.parse(j.choices[0].message.content); } catch { p = {}; }

  // сопоставить контрагента с id
  let cpId = (known && known.counterparty_id) || null;
  let cpName = null;
  if (p.counterparty) {
    const q = String(p.counterparty).toLowerCase();
    const found = cps.find((c) => c.name.toLowerCase() === q)
      || cps.find((c) => c.name.toLowerCase().includes(q))
      || cps.find((c) => q.includes(c.name.toLowerCase()));
    if (found) { cpId = found.id; cpName = found.name; }
    else cpName = p.counterparty;
  }

  // слияние с известным
  const merged = {
    counterparty_id: cpId,
    counterparty_name: cpName,
    work_type: p.work_type || (known && known.work_type) || null,
    revenue: typeof p.revenue === "number" ? p.revenue : (known ? known.revenue : null) ?? null,
    payout: typeof p.payout === "number" ? p.payout : (known ? known.payout : null) ?? null,
    payment_method: p.payment_method || (known && known.payment_method) || null,
    documents: Array.isArray(p.documents) && p.documents.length ? p.documents : (known && known.documents) || [],
  };
  return merged;
}
