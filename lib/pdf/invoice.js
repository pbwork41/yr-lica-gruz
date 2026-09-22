import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { money, rubWords, vatCalc } from "./helpers";

const FONT = path.join(process.cwd(), "public/assets/DejaVuSans.ttf");
const FONTB = path.join(process.cwd(), "public/assets/DejaVuSans-Bold.ttf");
const SIG = path.join(process.cwd(), "public/assets/signature.png");
const mm = (v) => v * 2.834645669;

// pdfkit: Y растёт СВЕРХУ ВНИЗ. y — текущая позиция от верха.
export function buildInvoice(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: mm(15) });
    doc.registerFont("DV", FONT);
    doc.registerFont("DVB", FONTB);
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { org, client, doc: d, item, vatMode, withSign } = data;
    const v = vatCalc(item.total, vatMode);
    const x = mm(15), right = mm(210 - 15);
    let y = mm(15);

    const T = (s, xx, yy, size = 9, bold = false) => doc.font(bold ? "DVB" : "DV").fontSize(size).fillColor("#000").text(s || "", xx, yy, { lineBreak: false });
    const TR = (s, xx, yy, size = 9, bold = false) => { doc.font(bold ? "DVB" : "DV").fontSize(size); const w = doc.widthOfString(s || ""); doc.text(s || "", xx - w, yy, { lineBreak: false }); };
    const line = (x1, y1, x2, y2, w = 0.5) => doc.lineWidth(w).moveTo(x1, y1).lineTo(x2, y2).stroke("#000");

    // ── Банковская шапка (4 строки) ──
    const colInn = x + mm(106), colBik = x + mm(138);
    const rowH = mm(6.5);
    const top = y;
    const r1b = top + rowH, r2b = top + 2 * rowH, r3b = top + 3 * rowH, r4b = top + 4 * rowH;
    // внешние + горизонтальные
    line(x, top, right, top); line(x, r1b, right, r1b); line(x, r2b, right, r2b); line(x, r4b, right, r4b);
    line(x, top, x, r4b); line(right, top, right, r4b);
    // вертикали правых ячеек (строки 1-3)
    line(colInn, top, colInn, r3b); line(colBik, top, colBik, r3b);
    // тексты
    const tv = (row) => top + row * rowH + mm(2.2); // baseline внутри строки
    T("Банк получателя", x + mm(2), tv(0), 8);
    T(org.bank_name, x + mm(40), tv(0), 7, true);
    T("БИК", colInn + mm(2), tv(0), 8);
    T(org.bank_bik, colBik + mm(2), tv(0), 8, true);
    T("Сч. №", colInn + mm(2), tv(1), 8);
    T(org.corr_account, colBik + mm(2), tv(1), 8, true);
    T(`ИНН ${org.inn}`, x + mm(2), tv(2), 8);
    T("Сч. №", colInn + mm(2), tv(2), 8);
    T(org.bank_account, colBik + mm(2), tv(2), 8, true);
    T("Получатель", x + mm(2), tv(3), 8);
    T(org.short_name, x + mm(45), tv(3), 8, true);

    y = r4b + mm(10);
    doc.font("DVB").fontSize(14).fillColor("#000").text(`Счёт на оплату № ${d.number} от ${d.date}`, x, y);
    y += mm(8);
    line(x, y, right, y, 1.2);
    y += mm(8);

    const party = (label, name, inn, kpp, addr, yy) => {
      T(label, x, yy, 9, true);
      let l = `${name}, ИНН ${inn}`; if (kpp) l += `, КПП ${kpp}`;
      T(l, x + mm(32), yy, 9);
      if (addr) {
        doc.font("DV").fontSize(8.5).fillColor("#000").text(addr, x + mm(32), yy + mm(5), { width: right - x - mm(32) });
        return Math.max(yy + mm(13), doc.y + mm(3));
      }
      return yy + mm(13);
    };
    y = party("Исполнитель:", org.short_name, org.inn, "", org.legal_address, y);
    y = party("Заказчик:", client.name, client.inn || "", client.kpp || "", client.address || "", y);
    y += mm(2);

    // ── Таблица ──
    const cols = [x, x + mm(10), x + mm(106), x + mm(126), x + mm(141), x + mm(163), right];
    const headers = ["№", "Товары (работы, услуги)", "Кол-во", "Ед.", "Цена", "Сумма"];
    const th = y, hh = mm(8);
    doc.rect(x, th, right - x, hh).fillAndStroke("#eeeeee", "#000"); doc.fillColor("#000");
    headers.forEach((h, i) => T(h, cols[i] + mm(1.5), th + mm(2.7), 8, true));
    cols.forEach((cx) => line(cx, th, cx, th + hh));
    const ry = th + hh, rh = mm(8);
    line(x, ry + rh, right, ry + rh);
    cols.forEach((cx) => line(cx, ry, cx, ry + rh));
    T("1", cols[0] + mm(1.5), ry + mm(2.7), 8);
    T(item.name, cols[1] + mm(1.5), ry + mm(2.7), 8);
    T("1", cols[2] + mm(1.5), ry + mm(2.7), 8);
    T("усл.", cols[3] + mm(1.5), ry + mm(2.7), 8);
    TR(money(v.total), cols[5] - mm(1.5), ry + mm(2.7), 8);
    TR(money(v.total), cols[6] - mm(1.5), ry + mm(2.7), 8);
    y = ry + rh + mm(8);

    const tl = (label, val, bold) => { TR(label, x + mm(150), y, 9, bold); TR(money(val), right, y, 9, bold); y += mm(5.5); };
    tl("Итого:", v.total, true);
    if (v.rate) tl("В том числе НДС (5%):", v.vat, false); else tl("Без НДС", 0, false);
    tl("Всего к оплате:", v.total, true);
    y += mm(4);
    T(`Всего наименований 1, на сумму ${money(v.total)} руб.`, x, y, 9);
    y += mm(6);
    T(rubWords(v.total), x, y, 9, true);
    y += mm(12);
    line(x, y, right, y, 1.2);
    y += mm(14);

    // ── Подпись ──
    T("Руководитель", x, y, 9);
    const sx1 = x + mm(32), sx2 = x + mm(92);
    const lineY = y + mm(4);
    line(sx1, lineY, sx2, lineY, 0.7);
    T("/ Барков П. В. /", sx2 + mm(6), y, 9);
    if (withSign && fs.existsSync(SIG)) {
      const sw = mm(38), sh = sw * 434 / 526;
      try { doc.image(SIG, sx1 + mm(8), lineY - sh * 0.7, { width: sw }); } catch (e) {}
    }
    doc.fillColor("#666").font("DV").fontSize(7);
    const cap = "(подпись)", cw = doc.widthOfString(cap);
    doc.text(cap, (sx1 + sx2) / 2 - cw / 2, lineY + mm(1.5), { lineBreak: false });
    doc.fillColor("#000");
    T("М.П.", x, y + mm(10), 7.5);

    doc.end();
  });
}
