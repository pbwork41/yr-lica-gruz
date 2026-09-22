import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { money, vatCalc } from "./helpers";

const FONT = path.join(process.cwd(), "public/assets/DejaVuSans.ttf");
const FONTB = path.join(process.cwd(), "public/assets/DejaVuSans-Bold.ttf");
const SIG = path.join(process.cwd(), "public/assets/signature.png");
const mm = (v) => v * 2.834645669;

// Y сверху вниз (pdfkit)
export function buildUpd(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: mm(8) });
    doc.registerFont("DV", FONT);
    doc.registerFont("DVB", FONTB);
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { org, client, doc: d, item, vatMode, withSign, basis } = data;
    const v = vatCalc(item.total, vatMode);
    const W = mm(297);
    const x0 = mm(8), x1 = W - mm(8);
    let y = mm(8);

    const T = (s, xx, yy, size = 7, bold = false) => doc.font(bold ? "DVB" : "DV").fontSize(size).fillColor("#000").text(s || "", xx, yy, { lineBreak: false });
    const TC = (s, cx, yy, size = 7, bold = false) => { doc.font(bold ? "DVB" : "DV").fontSize(size); const w = doc.widthOfString(s || ""); doc.fillColor("#000").text(s || "", cx - w / 2, yy, { lineBreak: false }); };
    const TR = (s, xx, yy, size = 7, bold = false) => { doc.font(bold ? "DVB" : "DV").fontSize(size); const w = doc.widthOfString(s || ""); doc.text(s || "", xx - w, yy, { lineBreak: false }); };
    const line = (x1_, y1_, x2_, y2_, w = 0.4) => doc.lineWidth(w).moveTo(x1_, y1_).lineTo(x2_, y2_).stroke("#000");
    const box = (xa, ya, xb, yb, w = 0.4) => doc.lineWidth(w).rect(xa, ya, xb - xa, yb - ya).stroke("#000");

    // Заголовок
    T("Универсальный", x0, y, 7, true);
    T("передаточный", x0, y + mm(3), 7, true);
    T("документ", x0, y + mm(6), 7, true);
    TR("Приложение № 1 к постановлению Правительства РФ от 26 декабря 2011 г. № 1137", x1, y, 6);
    TR("(в редакции постановления Правительства РФ от 23 января 2026 г. № 26)", x1, y + mm(3), 6);

    const cx = x0 + mm(42);
    const sfY = y + mm(2);
    T("Счёт-фактура №", cx, sfY, 7);
    line(cx + mm(22), sfY + mm(3.5), cx + mm(52), sfY + mm(3.5));
    TC(d.number, cx + mm(37), sfY, 7);
    T("от", cx + mm(54), sfY, 7);
    line(cx + mm(59), sfY + mm(3.5), cx + mm(95), sfY + mm(3.5));
    TC(d.date, cx + mm(77), sfY, 7);
    TR("(1)", cx + mm(118), sfY, 7);
    T("Исправление №", cx, sfY + mm(4), 7);
    line(cx + mm(22), sfY + mm(7.5), cx + mm(52), sfY + mm(7.5));
    TC("--", cx + mm(37), sfY + mm(4), 7);
    T("от", cx + mm(54), sfY + mm(4), 7);
    line(cx + mm(59), sfY + mm(7.5), cx + mm(95), sfY + mm(7.5));
    TR("(1а)", cx + mm(118), sfY + mm(4), 7);

    // Статус
    const stY = y + mm(14);
    box(x0, stY, x0 + mm(38), stY + mm(8));
    T("Статус:", x0 + mm(1), stY + mm(2.5), 7);
    box(x0 + mm(16), stY + mm(1), x0 + mm(24), stY + mm(7));
    TC(d.status || "1", x0 + mm(20), stY + mm(2.5), 9, true);
    T("1 – счёт-фактура и", x0, stY + mm(12), 6);
    T("передаточный", x0 + mm(3), stY + mm(15), 6);
    T("документ (акт)", x0 + mm(3), stY + mm(18), 6);
    T("2 – передаточный", x0, stY + mm(21), 6);
    T("документ (акт)", x0 + mm(3), stY + mm(24), 6);

    // Продавец (левая часть от cx)
    const lx = cx;
    let py = sfY + mm(10);
    const field = (label, val, xx, yy, code, lw = mm(30), vw = mm(88)) => {
      T(label, xx, yy, 7);
      line(xx + lw, yy + mm(3.2), xx + lw + vw, yy + mm(3.2));
      T(val, xx + lw + mm(1), yy, 7);
      if (code) TR(code, xx + lw + vw + mm(8), yy, 7);
    };
    field("Продавец:", org.name, lx, py, "(2)"); py += mm(4);
    // Адрес 2 строки
    T("Адрес:", lx, py, 7);
    doc.font("DV").fontSize(5.8);
    const addr = org.legal_address || "";
    let l1 = "", l2 = "";
    addr.split(" ").forEach((w) => {
      if (doc.widthOfString(l1 + w + " ") < mm(86)) l1 += w + " "; else l2 += w + " ";
    });
    T(l1.trim(), lx + mm(16), py, 5.8);
    T(l2.trim(), lx + mm(16), py + mm(2.6), 5.8);
    line(lx + mm(15), py + mm(5.5), lx + mm(118), py + mm(5.5));
    TR("(2а)", lx + mm(126), py, 7);
    py += mm(6);
    field("ИНН/КПП продавца:", org.inn, lx, py, "(2б)"); py += mm(4);
    field("Грузоотправитель и его адрес:", "--", lx, py, "(3)"); py += mm(4);
    field("Грузополучатель и его адрес:", "--", lx, py, "(4)"); py += mm(4);
    field("К платёжно-расчётному документу №", "  от", lx, py, "(5)"); py += mm(4);
    field("Документ об отгрузке", `Универсальный передаточный документ, № ${d.number} от ${d.dateShort}`, lx, py, ""); py += mm(6);

    // Покупатель (правая часть)
    const rx = W - mm(8) - mm(112);
    let ry2 = sfY + mm(10);
    const fieldR = (label, val, xx, yy, code, lw = mm(34), vw = mm(66)) => {
      T(label, xx, yy, 7);
      line(xx + lw, yy + mm(3.2), xx + lw + vw, yy + mm(3.2));
      T(val, xx + lw + mm(1), yy, 7);
      if (code) TR(code, x1, yy, 7);
    };
    fieldR("Покупатель:", client.name, rx, ry2, "(6)"); ry2 += mm(4);
    fieldR("Адрес:", client.address || "", rx, ry2, "(6а)"); ry2 += mm(6);
    fieldR("ИНН/КПП покупателя:", `${client.inn || ""}${client.kpp ? "/" + client.kpp : ""}`, rx, ry2, "(6б)"); ry2 += mm(4);
    fieldR("Валюта: наименование, код", "Российский рубль, 643", rx, ry2, "(7)", mm(42), mm(58)); ry2 += mm(4);
    T("Идентификатор государственного контракта,", rx, ry2, 7); ry2 += mm(4);
    T("договора (соглашения) (при наличии)", rx, ry2, 7);
    line(rx + mm(50), ry2 + mm(3.2), x1, ry2 + mm(3.2));
    TR("(8)", x1, ry2, 7);

    const explY = py + mm(2);
    T("К счёту-фактуре (счетам-фактурам), выставленному (выставленным) при получении оплаты, частичной оплаты или иных", lx, explY, 6);
    T("платежей в счёт предстоящих поставок товаров (выполнения работ, оказания услуг), передачи имущественных прав", lx, explY + mm(3), 6);
    T("№  от , исправление  от", lx, explY + mm(6), 6);
    TR("(5б)", x1, explY + mm(6), 7);

    // ── Таблица ──
    const tblTop = explY + mm(10);
    const widths = [22, 8, 55, 14, 20, 14, 20, 24, 14, 16, 24, 24, 22, 24];
    const totalW = widths.reduce((a, b) => a + b, 0);
    const scale = (x1 - x0) / mm(totalW);
    const xs = [x0];
    widths.forEach((w) => xs.push(xs[xs.length - 1] + mm(w) * scale));
    const labels = ["Код товара/\nработ, услуг", "№\nп/п",
      "Наименование товара (описание\nвыполненных работ, оказанных\nуслуг), имущественного права",
      "Код вида\nтовара", "Единица измерения\n(код / условное)", "Коли-\nчество\n(объём)",
      "Цена (тариф)\nза единицу\nизмерения", "Стоимость\nтоваров (работ,\nуслуг) без\nналога — всего",
      "В том\nчисле\nсумма\nакциза", "Налоговая\nставка", "Сумма налога,\nпредъявляемая\nпокупателю",
      "Стоимость\nтоваров (работ,\nуслуг) с\nналогом — всего", "Страна происх.\n(код / кратк.)",
      "Рег. номер\nдекларации /\nпартии товара"];
    const hdrH = mm(20);
    const hdrBot = tblTop + hdrH;
    xs.forEach((xi) => line(xi, tblTop, xi, hdrBot));
    line(x0, tblTop, x1, tblTop); line(x0, hdrBot, x1, hdrBot);
    labels.forEach((lab, i) => {
      const lns = lab.split("\n");
      let yy = tblTop + mm(2);
      lns.forEach((ln) => { TC(ln, (xs[i] + xs[i + 1]) / 2, yy, 5.3); yy += mm(2.4); });
    });
    const numrow = ["А", "1", "1а", "1б", "2", "2а", "3", "4", "5", "6", "7", "8", "9", "10"];
    const numTop = hdrBot;
    const numBot = hdrBot + mm(5);
    line(x0, numBot, x1, numBot);
    xs.forEach((xi) => line(xi, numTop, xi, numBot));
    numrow.forEach((nr, i) => TC(nr, (xs[i] + xs[i + 1]) / 2, numTop + mm(1), 6));

    const rowTop = numBot, rowH = mm(8), rowBot = rowTop + rowH;
    xs.forEach((xi) => line(xi, rowTop, xi, rowBot));
    line(x0, rowBot, x1, rowBot);
    const cell = (i, s, size = 6, align = "c") => {
      const xa = xs[i], xb = xs[i + 1], yy = rowTop + mm(2.5);
      if (align === "c") TC(s, (xa + xb) / 2, yy, size);
      else if (align === "l") T(s, xa + mm(1), yy, size);
      else TR(s, xb - mm(1), yy, size);
    };
    cell(0, "00-00000021"); cell(1, "1"); cell(2, item.name, 6, "l");
    cell(3, "--"); cell(4, "-- / --"); cell(5, "--"); cell(6, "--");
    cell(7, money(v.base), 6, "r"); cell(8, "без акциза");
    cell(9, v.rate ? "5%" : "Без НДС"); cell(10, money(v.vat), 6, "r");
    cell(11, money(v.total), 6, "r"); cell(12, "-- / --"); cell(13, "--");

    const totTop = rowBot, totBot = rowBot + mm(6);
    line(x0, totBot, x1, totBot);
    [xs[0], xs[7], xs[8], xs[10], xs[11], xs[12], x1].forEach((xi) => line(xi, totTop, xi, totBot));
    T("Всего к оплате (9)", x0 + mm(1), totTop + mm(1.5), 6, true);
    TR(money(v.base), xs[8] - mm(1), totTop + mm(1.5), 6);
    TC("X", (xs[9] + xs[10]) / 2, totTop + mm(1.5), 6, true);
    TR(money(v.vat), xs[11] - mm(1), totTop + mm(1.5), 6);
    TR(money(v.total), xs[12] - mm(1), totTop + mm(1.5), 6);

    // ── Подписи счёт-фактуры ──
    let sy = totBot + mm(3);
    T("Документ", x0, sy, 6);
    T("составлен на", x0, sy + mm(3), 6);
    T("1 листе", x0, sy + mm(6), 6);
    const col2 = x0 + mm(30);
    T("Руководитель организации", col2, sy, 6.5);
    T("или иное уполномоченное лицо", col2, sy + mm(3), 6.5);
    line(col2 + mm(52), sy + mm(3.5), col2 + mm(80), sy + mm(3.5));
    TC("(подпись)", col2 + mm(66), sy + mm(4.5), 5.5);
    line(col2 + mm(82), sy + mm(3.5), col2 + mm(118), sy + mm(3.5));
    TC("(ф.и.о.)", col2 + mm(100), sy + mm(4.5), 5.5);
    const col3 = col2 + mm(128);
    T("Главный бухгалтер", col3, sy, 6.5);
    T("или иное уполномоченное лицо", col3, sy + mm(3), 6.5);
    line(col3 + mm(52), sy + mm(3.5), col3 + mm(78), sy + mm(3.5));
    TC("(подпись)", col3 + mm(65), sy + mm(4.5), 5.5);
    line(col3 + mm(80), sy + mm(3.5), col3 + mm(112), sy + mm(3.5));
    TC("(ф.и.о.)", col3 + mm(96), sy + mm(4.5), 5.5);

    sy += mm(9);
    T("Индивидуальный предприниматель", col2, sy, 6.5);
    T("или иное уполномоченное лицо", col2, sy + mm(3), 6.5);
    line(col2 + mm(52), sy + mm(3.5), col2 + mm(80), sy + mm(3.5));
    TC("Барков П. В.", col2 + mm(66), sy + mm(0.5), 7);
    if (withSign && fs.existsSync(SIG)) {
      const sw = mm(24), sh = sw * 434 / 526;
      try { doc.image(SIG, col2 + mm(52), sy + mm(3.5) - sh * 0.72, { width: sw }); } catch (e) {}
    }
    TC("(подпись)", col2 + mm(66), sy + mm(4.5), 5.5);
    line(col2 + mm(82), sy + mm(3.5), col2 + mm(118), sy + mm(3.5));
    T(org.ogrnip_line, col3 + mm(40), sy + mm(0.5), 6);
    T("(основной государственный регистрационный номер", col3 + mm(40), sy + mm(3.5), 5);
    T("индивидуального предпринимателя и дата присвоения такого номера)", col3 + mm(40), sy + mm(6), 5);

    // ── Нижняя часть ──
    let bY = sy + mm(11);
    line(x0, bY - mm(2), x1, bY - mm(2), 0.6);
    T("Основание передачи (сдачи) / получения (приёмки)", x0, bY, 7);
    line(x0 + mm(75), bY + mm(3.2), x1 - mm(15), bY + mm(3.2));
    T(basis || "", x0 + mm(76), bY, 7);
    TR("[8]", x1, bY, 7);
    TC("(договор; доверенность и др.)", (x0 + mm(75) + x1 - mm(15)) / 2, bY + mm(4.5), 5.5);

    bY += mm(8);
    T("Данные о транспортировке и грузе", x0, bY, 7);
    line(x0 + mm(55), bY + mm(3.2), x1 - mm(15), bY + mm(3.2));
    TR("[9]", x1, bY, 7);

    bY += mm(9);
    const half = (x1 - x0) / 2;
    T("Товар (груз) передал / услуги, результаты работ, права сдал", x0, bY, 6.5);
    T("Товар (груз) получил / услуги, результаты работ, права принял", x0 + half + mm(3), bY, 6.5);
    bY += mm(6);
    line(x0, bY, x0 + mm(40), bY); TC("(должность)", x0 + mm(20), bY + mm(1), 5);
    line(x0 + mm(42), bY, x0 + mm(58), bY); TC("(подпись)", x0 + mm(50), bY + mm(1), 5);
    T("Барков П. В.", x0 + mm(62), bY - mm(3), 7);
    line(x0 + mm(60), bY, x0 + half - mm(8), bY); TC("(ф.и.о.)", x0 + mm(80), bY + mm(1), 5);
    TR("[10]", x0 + half - mm(2), bY - mm(3), 6);
    const gx = x0 + half + mm(3);
    line(gx, bY, gx + mm(38), bY); TC("(должность)", gx + mm(19), bY + mm(1), 5);
    line(gx + mm(40), bY, gx + mm(56), bY); TC("(подпись)", gx + mm(48), bY + mm(1), 5);
    line(gx + mm(58), bY, gx + mm(94), bY); TC("(ф.и.о.)", gx + mm(76), bY + mm(1), 5);
    TR("[15]", x1, bY - mm(3), 6);

    bY += mm(8);
    T("Дата отгрузки, передачи (сдачи)", x0, bY, 6.5);
    line(x0 + mm(48), bY + mm(3.2), x0 + half - mm(8), bY + mm(3.2));
    T(d.shipDate || "", x0 + mm(50), bY, 7);
    TR("[11]", x0 + half - mm(2), bY, 6);
    T("Дата получения (приёмки)", gx, bY, 6.5);
    line(gx + mm(42), bY + mm(3.2), gx + mm(94), bY + mm(3.2));
    TR("[16]", x1, bY, 6);

    bY += mm(7);
    T("Иные сведения об отгрузке, передаче", x0, bY, 6.5);
    line(x0 + mm(55), bY + mm(3.2), x0 + half - mm(8), bY + mm(3.2));
    TR("[12]", x0 + half - mm(2), bY, 6);
    T("Иные сведения о получении, приёмке", gx, bY, 6.5);
    line(gx + mm(55), bY + mm(3.2), gx + mm(94), bY + mm(3.2));
    TR("[17]", x1, bY, 6);

    bY += mm(8);
    T("Ответственный за правильность оформления факта хозяйственной жизни", x0, bY, 6);
    T("Ответственный за правильность оформления факта хозяйственной жизни", gx, bY, 6);
    bY += mm(5);
    T("Индивидуальный предприниматель", x0, bY, 6.5);
    line(x0 + mm(52), bY + mm(3.2), x0 + half - mm(8), bY + mm(3.2));
    if (withSign && fs.existsSync(SIG)) {
      const sw = mm(20), sh = sw * 434 / 526;
      try { doc.image(SIG, x0 + mm(53), bY + mm(3.2) - sh * 0.72, { width: sw }); } catch (e) {}
    }
    T("Барков П. В.", x0 + mm(56), bY, 7);
    TR("[13]", x0 + half - mm(2), bY, 6);
    line(gx + mm(52), bY + mm(3.2), gx + mm(94), bY + mm(3.2));
    TR("[18]", x1, bY, 6);

    bY += mm(8);
    T("Наименование экономического субъекта — составителя документа (в т.ч. комиссионера / агента)", x0, bY, 6);
    T(`${org.name}, ИНН ${org.inn}`, x0, bY + mm(4), 7);
    TR("[14]", x0 + half - mm(2), bY + mm(4), 6);
    T("Наименование экономического субъекта — составителя документа", gx, bY, 6);
    T(`${client.name}${client.inn ? ", ИНН/КПП " + client.inn + (client.kpp ? "/" + client.kpp : "") : ""}`, gx, bY + mm(4), 7);
    TR("[19]", x1, bY + mm(4), 6);

    bY += mm(10);
    T("М.П.", x0, bY, 7); T("М.П.", gx, bY, 7);

    doc.end();
  });
}
