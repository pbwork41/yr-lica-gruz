// Разбор карточки компании (реквизиты) из текста или изображения через GPT
const OPENAI = "https://api.openai.com/v1";

const FIELDS_PROMPT = `Извлеки реквизиты компании из документа/текста и верни СТРОГО JSON:
{
 "name": "полное или сокращённое название (напр. ООО «Восток-Логистик») или null",
 "inn": "ИНН (только цифры) или null",
 "kpp": "КПП (только цифры) или null",
 "legal_address": "юридический адрес или null",
 "bank_name": "название банка или null",
 "bank_account": "расчётный счёт (20 цифр) или null",
 "corr_account": "корреспондентский счёт или null",
 "bank_bik": "БИК или null",
 "contact_person": "контактное лицо или null",
 "contact_phone": "телефон или null",
 "contact_email": "email или null"
}
Правила: ИНН/КПП/счета — только цифры без пробелов. Название сохраняй как в документе. Чего нет — null. Только JSON.`;

// Разбор из текста
export async function parseCompanyText(text, openaiKey) {
  const r = await fetch(`${OPENAI}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: FIELDS_PROMPT }, { role: "user", content: text }],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error("GPT: " + j.error.message);
  try { return JSON.parse(j.choices[0].message.content); } catch { return {}; }
}

// Разбор из изображения (base64 dataURL) через Vision
export async function parseCompanyImage(dataUrl, openaiKey) {
  const r = await fetch(`${OPENAI}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: FIELDS_PROMPT + "\nНа изображении карточка компании с реквизитами." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      }],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error("Vision: " + j.error.message);
  try { return JSON.parse(j.choices[0].message.content); } catch { return {}; }
}

// Скачать файл Telegram как base64 dataURL (для фото/документов-картинок)
export async function tgFileToDataUrl(token, fileId, mime = "image/jpeg") {
  const fr = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const fj = await fr.json();
  if (!fj.ok) throw new Error("Не удалось получить файл");
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${fj.result.file_path}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${mime};base64,${buf.toString("base64")}`;
}
