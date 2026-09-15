// Форматтеры
export const rub = (n) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " ₽";
export const rub2 = (n) =>
  new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + " ₽";

export function fmtDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}
export function daysAgo(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const d = Math.round((today - new Date(dateStr)) / 86400000);
  if (d <= 0) return "сегодня";
  if (d === 1) return "вчера";
  return `${d} дн. назад`;
}

export const WORK_TYPES = {
  container_20: "Разгрузка контейнера 20 фут",
  container_40: "Разгрузка контейнера 40 фут",
  hourly: "Почасовые работы",
  warehouse: "Работа на складе",
  manual: "Другое",
};

export const EXPENSE_CATS = {
  salary: "Зарплата",
  ads: "Реклама",
  communication: "Связь",
  rent: "Аренда",
  contractor: "Подрядчик",
  other: "Прочее",
};

// Расчёт по заявке — точное зеркало legal.orders_calc в БД.
export function calcOrder(o) {
  const cashless = o.payment_method === "cashless";
  const round2 = (n) => Math.round(n * 100) / 100;
  const revenue = +o.revenue || 0;
  const payout = +o.payout || 0;

  const vat = cashless ? round2(revenue * 0.05) : 0;
  const smz3 = cashless && o.calc_smz_service ? round2(payout * 0.03) : 0;
  const smz6 = cashless && o.calc_smz_tax ? round2(payout * 0.06) : 0;
  const logist = o.calc_logist ? round2(payout * 0.05) : 0;
  const ads = o.calc_ads ? round2(revenue * 0.05) : 0;

  const usnBase = cashless ? Math.max(revenue - payout - smz3 - smz6, 0) : 0;
  const usn = cashless ? round2(usnBase * 0.1) : 0;

  const gross = revenue - payout;
  const net = round2(revenue - payout - vat - smz3 - smz6 - logist - ads - usn);
  const margin = revenue > 0 ? round2((net / revenue) * 100) : 0;

  return {
    vat, smz3, smz6, logist, ads, usnBase, usn, gross, net, margin,
    partner: round2(net * 0.4),
    owner: round2(net * 0.6),
  };
}
