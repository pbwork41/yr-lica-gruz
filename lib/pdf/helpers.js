// Хелперы для генерации документов (сервер)

export function money(n) {
  return Number(n || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Сумма прописью (рубли/копейки)
export function rubWords(n) {
  const units = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const unitsF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
  const teens = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
    "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
  const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
  const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

  const triple = (num, female) => {
    const u = female ? unitsF : units;
    const r = [];
    const h = Math.floor(num / 100), t = Math.floor((num % 100) / 10), o = num % 10;
    if (h) r.push(hundreds[h]);
    if (t === 1) r.push(teens[o]);
    else { if (t) r.push(tens[t]); if (o) r.push(u[o]); }
    return r.join(" ");
  };
  const plural = (num, forms) => {
    let nn = num % 100;
    if (nn >= 11 && nn <= 14) return forms[2];
    nn = num % 10;
    if (nn === 1) return forms[0];
    if (nn >= 2 && nn <= 4) return forms[1];
    return forms[2];
  };

  const rub = Math.floor(n);
  const kop = Math.round((n - rub) * 100);
  const parts = [];
  const mil = Math.floor(rub / 1000000);
  const thou = Math.floor((rub % 1000000) / 1000);
  const rest = rub % 1000;
  if (mil) parts.push(triple(mil, false) + " " + plural(mil, ["миллион", "миллиона", "миллионов"]));
  if (thou) parts.push(triple(thou, true) + " " + plural(thou, ["тысяча", "тысячи", "тысяч"]));
  if (rest || !parts.length) parts.push(triple(rest, false));
  let words = parts.filter((p) => p.trim()).join(" ").trim() || "ноль";
  words = words[0].toUpperCase() + words.slice(1);
  return `${words} ${plural(rub, ["рубль", "рубля", "рублей"])} ${String(kop).padStart(2, "0")} копеек`;
}

export function fmtDateRu(iso) {
  if (!iso) iso = new Date().toISOString().slice(0, 10);
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  const [y, m, d] = iso.split("-");
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y} г.`;
}

// НДС: для режима included НДС в том числе, added — сверху, none — без НДС
export function vatCalc(total, vatMode) {
  const RATE = 0.05;
  if (vatMode === "none") return { base: total, vat: 0, total, rate: null };
  if (vatMode === "added") {
    const vat = Math.round(total * RATE * 100) / 100;
    return { base: total, vat, total: total + vat, rate: RATE };
  }
  // included
  const base = Math.round((total / (1 + RATE)) * 100) / 100;
  const vat = Math.round((total - base) * 100) / 100;
  return { base, vat, total, rate: RATE };
}
