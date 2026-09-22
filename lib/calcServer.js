// Серверный расчёт заявки — зеркало lib/calc.js calcOrder (без React)
export function calcOrderJs(o) {
  const cashless = o.payment_method === "cashless";
  const r2 = (n) => Math.round(n * 100) / 100;
  const revenue = +o.revenue || 0;
  const payout = +o.payout || 0;

  const vat = cashless ? r2(revenue * 0.05) : 0;
  const smz3 = cashless && o.calc_smz_service ? r2(payout * 0.03) : 0;
  const smz6 = cashless && o.calc_smz_tax ? r2(payout * 0.06) : 0;
  const logist = o.calc_logist ? r2(payout * 0.05) : 0;
  const ads = o.calc_ads ? r2(revenue * 0.05) : 0;

  const usnBase = cashless ? Math.max(revenue - payout - smz3 - smz6, 0) : 0;
  const usn = cashless ? r2(usnBase * 0.1) : 0;

  const net = r2(revenue - payout - vat - smz3 - smz6 - logist - ads - usn);
  return { vat, smz3, smz6, logist, ads, usnBase, usn, net, owner: r2(net * 0.6), partner: r2(net * 0.4) };
}
