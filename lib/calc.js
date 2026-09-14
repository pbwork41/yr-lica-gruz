// Форматтеры
export const rub = (n) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " \u20BD";
export const rub2 = (n) =>
  new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + " \u20BD";

export function fmtDate(s) {
  if (!s) return "\u2014";
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y.slice(2)}`;
}
export function daysAgo(dateStr, today = new Date()) {
  if (!dateStr) return null;
  const d = Math.round((today - new Date(dateStr)) / 86400000);
  if (d <= 0) return "\u0441\u0435\u0433\u043E\u0434\u043D\u044F";
  if (d === 1) return "\u0432\u0447\u0435\u0440\u0430";
  return `${d} \u0434\u043D. \u043D\u0430\u0437\u0430\u0434`;
}

export const WORK_TYPES = {
  container_20: "\u0420\u0430\u0437\u0433\u0440\u0443\u0437\u043A\u0430 \u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440\u0430 20 \u0444\u0443\u0442",
  container_40: "\u0420\u0430\u0437\u0433\u0440\u0443\u0437\u043A\u0430 \u043A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440\u0430 40 \u0444\u0443\u0442",
  hourly: "\u041F\u043E\u0447\u0430\u0441\u043E\u0432\u044B\u0435 \u0440\u0430\u0431\u043E\u0442\u044B",
  warehouse: "\u0420\u0430\u0431\u043E\u0442\u0430 \u043D\u0430 \u0441\u043A\u043B\u0430\u0434\u0435",
  manual: "\u0414\u0440\u0443\u0433\u043E\u0435",
};

export const EXPENSE_CATS = {
  salary: "\u0417\u0430\u0440\u043F\u043B\u0430\u0442\u0430",
  ads: "\u0420\u0435\u043A\u043B\u0430\u043C\u0430",
  communication: "\u0421\u0432\u044F\u0437\u044C",
  rent: "\u0410\u0440\u0435\u043D\u0434\u0430",
  contractor: "\u041F\u043E\u0434\u0440\u044F\u0434\u0447\u0438\u043A",
  other: "\u041F\u0440\u043E\u0447\u0435\u0435",
};

// Расчёт по заявке — точное зеркало legal.orders_calc в БД.
// БЕЗНАЛ: НДС 5%, СЗ 3%+6% (по галочкам, уменьшают базу УСН), УСН 10%, логист 5%, реклама 5%.
// НАЛ: без налогов, только логист 5% и реклама 5% по галочкам.
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
