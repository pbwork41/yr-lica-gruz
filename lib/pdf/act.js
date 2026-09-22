import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { money, rubWords, vatCalc } from "./helpers";

const FONT = path.join(process.cwd(), "public/assets/DejaVuSans.ttf");
const FONTB = path.join(process.cwd(), "public/assets/DejaVuSans-Bold.ttf");
const SIG = path.join(process.cwd(), "public/assets/signature.png");
const mm = (v) => v * 2.834645669;

export function buildAct(data) {
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
    const x = mm(15), right = mm(210 - 15), W = mm(210);
    let y = mm(18);

    const T = (s, xx, yy, size = 9, bold = false) => doc.font(bold ? "DVB" : "DV").fontSize(size).fillColor("#000").text(s || "", xx, yy, { lineBreak: false });
    const TC = (s, cx, yy, size = 9, bold = false) => { doc.font(bold ? "DVB" : "DV").fontSize(size); const w = doc.widthOfString(s || ""); doc.fillColor("#000").text(s || "", cx - w / 2, yy, { lineBreak: false }); };
    const TR = (s, xx, yy, size = 9, bold = false) => { doc.font(bold ? "DVB" : "DV").fontSize(size); const w = doc.widthOfString(s || ""); doc.text(s || "", xx - w, yy, { lineBreak: false }); };
    const line = (x1, y1, x2, y2, w = 0.5) => doc.lineWidth(w).moveTo(x1, y1).lineTo(x2, y2).stroke("#000");

    TC(`Акт № ${d.number} от ${d.date}`, W / 2, y, 13, true);
    y += mm(6);
    TC("сдачи-приёмки выполненных работ (оказанных услуг)", W / 2, y, 10);
    y += mm(12);

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
    T("Исполнитель выполнил, а Заказчик принял следующие работы (услуги):", x, y, 9);
    y += mm(8);

    const cols = [x, x + mm(10), x + mm(106), x + mm(126), x + mm(141), x + mm(163), right];
    const headers = ["№", "Наименование работ (услуг)", "Кол-во", "Ед.", "Цена", "Сумма"];
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
    y += mm(6);
    T(`Всего оказано услуг на сумму: ${money(v.total)} руб.`, x, y, 9);
    y += mm(5.5);
    T(rubWords(v.total), x, y, 9, true);
    y += mm(10);
    const txt = "Вышеперечисленные работы (услуги) выполнены полностью и в срок. Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.";
    doc.font("DV").fontSize(9).fillColor("#000").text(txt, x, y, { width: right - x });
    y = doc.y + mm(12);

    const colW = (right - x - mm(10)) / 2;
    const lx = x, rx = x + colW + mm(10);
    T("ИСПОЛНИТЕЛЬ", lx, y, 9, true);
    T("ЗАКАЗЧИК", rx, y, 9, true);
    const lineY = y + mm(22);
    if (withSign && fs.existsSync(SIG)) {
      const sw = mm(38), sh = sw * 434 / 526;
      try { doc.image(SIG, lx + mm(4), lineY - sh * 0.7, { width: sw }); } catch (e) {}
    }
    line(lx, lineY, lx + colW - mm(20), lineY, 0.7);
    line(rx, lineY, rx + colW - mm(20), lineY, 0.7);
    doc.fillColor("#666");
    T("(подпись)", lx, lineY + mm(1.5), 8); T("(подпись)", rx, lineY + mm(1.5), 8);
    doc.fillColor("#000");
    T("Барков П. В.", lx, lineY + mm(7), 9);
    T("________________", rx, lineY + mm(7), 9);
    doc.fillColor("#666");
    T("М.П.", lx, lineY + mm(14), 7.5); T("М.П.", rx, lineY + mm(14), 7.5);
    doc.fillColor("#000");

    doc.end();
  });
}
