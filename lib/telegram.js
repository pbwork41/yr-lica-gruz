// Хелперы Telegram Bot API
const API = (token) => `https://api.telegram.org/bot${token}`;

export async function tgSend(token, chatId, text, keyboard) {
  const body = { chat_id: chatId, text, parse_mode: "HTML" };
  if (keyboard) body.reply_markup = keyboard;
  const res = await fetch(`${API(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function tgSendDocument(token, chatId, filename, buffer, caption) {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  const blob = new Blob([buffer], { type: "application/pdf" });
  form.append("document", blob, filename);
  const res = await fetch(`${API(token)}/sendDocument`, { method: "POST", body: form });
  return res.json();
}

export async function tgAnswerCallback(token, callbackId, text) {
  await fetch(`${API(token)}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text: text || "" }),
  });
}

export async function tgEditText(token, chatId, messageId, text, keyboard) {
  const body = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (keyboard) body.reply_markup = keyboard;
  await fetch(`${API(token)}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Инлайн-клавиатура: rows = [[{text, data}], ...]
export function inlineKb(rows) {
  return { inline_keyboard: rows.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) };
}
