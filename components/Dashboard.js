"use client";
import React, { useState } from "react";
import { rub, rub2 } from "../lib/calc";
import { C, Row } from "./ui";

function weekRange(offset = 0) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const mon = new Date(now); mon.setDate(now.getDate() - day + offset * 7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const f = (d) => d.toISOString().slice(0, 10);
  return [f(mon), f(sun)];
}
function monthRange() {
  const n = new Date();
  const f = (d) => d.toISOString().slice(0, 10);
  return [f(new Date(n.getFullYear(), n.getMonth(), 1)), f(new Date(n.getFullYear(), n.getMonth() + 1, 0))];
}

export default function Dashboard({ rows, byCp, expenses }) {
  const [thisWeek] = useState(weekRange(0));
  const [lastWeek] = useState(weekRange(-1));
  const [from, setFrom] = useState(lastWeek[0]);
  const [to, setTo] = useState(lastWeek[1]);

  const paid = rows.filter((r) => r.is_paid && r.paid_date && r.paid_date >= from && r.paid_date <= to);
  const debt = rows.filter((r) => !r.is_paid && r.order_date >= from && r.order_date <= to);
  const sum = (list, f) => list.reduce((s, r) => s + f(r), 0);

  const expInPeriod = expenses.filter((e) => e.expense_date >= from && e.expense_date <= to);
  const generalExp = expInPeriod.filter((e) => e.category !== "ads").reduce((s, e) => s + (+e.amount || 0), 0);
  const adsSpentPeriod = expInPeriod.filter((e) => e.category === "ads").reduce((s, e) => s + (+e.amount || 0), 0);

  const P = {
    count: paid.length,
    revenue: sum(paid, (r) => +r.revenue || 0),
    payout: sum(paid, (r) => +r.payout || 0),
    vat: sum(paid, (r) => r.calc.vat),
    usn: sum(paid, (r) => r.calc.usn),
    smz: sum(paid, (r) => r.calc.smz3 + r.calc.smz6),
    logist: sum(paid, (r) => r.calc.logist),
    ads: sum(paid, (r) => r.calc.ads),
    net: sum(paid, (r) => r.calc.net),
  };
  const distributable = P.net - generalExp;
  P.owner = distributable * 0.6;
  P.partner = distributable * 0.4;

  const adsAccruedTotal = sum(rows.filter((r) => r.is_paid), (r) => r.calc.ads);
  const adsSpentTotal = expenses.filter((e) => e.category === "ads").reduce((s, e) => s + (+e.amount || 0), 0);
  const adsFundBalance = adsAccruedTotal - adsSpentTotal;
  const debtSum = sum(debt, (r) => +r.revenue || 0);

  const quick = (label, range) => (
    <button onClick={() => { setFrom(range[0]); setTo(range[1]); }}
      style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${C.line}`, background: from === range[0] && to === range[1] ? C.ink : C.card, color: from === range[0] && to === range[1] ? "#fff" : C.muted, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
      {label}
    </button>
  );
  const maxRev = Math.max(...byCp.map((c) => c.revenue), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {quick("\u042D\u0442\u0430 \u043D\u0435\u0434\u0435\u043B\u044F", thisWeek)}
          {quick("\u041F\u0440\u043E\u0448\u043B\u0430\u044F \u043D\u0435\u0434\u0435\u043B\u044F", lastWeek)}
          {quick("\u041C\u0435\u0441\u044F\u0446", monthRange())}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <input className="fld" style={{ width: 150 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: C.muted }}>{"\u2014"}</span>
          <input className="fld" style={{ width: 150 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <div style={{ background: C.card, border: `1.5px solid ${C.moss}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: C.mossSoft, padding: "13px 20px", borderBottom: `1px solid ${C.moss}22` }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, color: C.moss }}>\u041A \u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u044E</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>\u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u0432 \u043F\u0435\u0440\u0438\u043E\u0434\u0435 \u00B7 {P.count} \u0437\u0430\u043A\u0430\u0437(\u043E\u0432)</div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontWeight: 600 }}>\u041F\u0440\u0438\u0448\u043B\u043E \u0434\u0435\u043D\u0435\u0433</span>
              <span className="num" style={{ fontWeight: 700 }}>{rub2(P.revenue)}</span>
            </div>
            <div style={{ borderTop: `1px solid ${C.line}`, margin: "8px 0" }} />
            <Row k="\u0412\u044B\u043F\u043B\u0430\u0442\u044B \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F\u043C" v={"\u2212 " + rub2(P.payout)} />
            <Row k="\u041D\u0414\u0421 5%" v={"\u2212 " + rub2(P.vat)} c={C.clay} />
            <Row k="\u0423\u0421\u041D 10%" v={"\u2212 " + rub2(P.usn)} c={C.clay} />
            <Row k="\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u0438 \u0421\u0417 (3%+6%)" v={"\u2212 " + rub2(P.smz)} />
            <Row k="\u041B\u043E\u0433\u0438\u0441\u0442 5%" v={"\u2212 " + rub2(P.logist)} />
            <Row k="\u0420\u0435\u043A\u043B\u0430\u043C\u0430 5% (\u0432 \u0444\u043E\u043D\u0434)" v={"\u2212 " + rub2(P.ads)} c={C.gold} />
            <div style={{ borderTop: `1px solid ${C.line}`, margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontWeight: 600 }}>\u0427\u0438\u0441\u0442\u0430\u044F \u0441 \u0437\u0430\u043A\u0430\u0437\u043E\u0432</span>
              <span className="num" style={{ fontWeight: 600 }}>{rub2(P.net)}</span>
            </div>
            <Row k="\u041E\u0431\u0449\u0438\u0435 \u0440\u0430\u0441\u0445\u043E\u0434\u044B (\u0417\u041F, \u0441\u0432\u044F\u0437\u044C, \u0430\u0440\u0435\u043D\u0434\u0430\u2026)" v={"\u2212 " + rub2(generalExp)} c={C.clay} />
            <div style={{ borderTop: `1px solid ${C.line}`, margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: C.moss }}>\u041F\u0440\u0438\u0431\u044B\u043B\u044C</span>
              <span className="num" style={{ fontWeight: 700, fontSize: 17, color: C.moss }}>{rub2(distributable)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div style={{ background: C.paper, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: C.muted }}>\u041F\u0430\u0440\u0442\u043D\u0451\u0440 \u00B7 60%</div>
                <div className="num" style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600 }}>{rub(P.owner)}</div>
              </div>
              <div style={{ background: C.paper, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: C.muted }}>\u041F\u0430\u0440\u0442\u043D\u0451\u0440 \u00B7 40%</div>
                <div className="num" style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600 }}>{rub(P.partner)}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>\u0414\u0435\u0431\u0438\u0442\u043E\u0440\u043A\u0430 \u00B7 \u043D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E</div>
            <div className="num" style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 600, color: debt.length ? C.red : C.muted }}>{rub(debtSum)}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>{debt.length} \u0437\u0430\u043A\u0430\u0437(\u043E\u0432) \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E, \u0436\u0434\u0451\u043C \u043E\u043F\u043B\u0430\u0442\u0443</div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>\u0420\u0435\u043A\u043B\u0430\u043C\u043D\u044B\u0439 \u0444\u043E\u043D\u0434</div>
            <Row k="+ \u041D\u0430\u043A\u043E\u043F\u043B\u0435\u043D\u043E \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434" v={rub2(P.ads)} c={C.moss} />
            <Row k="\u2212 \u041F\u043E\u0442\u0440\u0430\u0447\u0435\u043D\u043E \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434" v={rub2(adsSpentPeriod)} c={C.gold} />
            <div style={{ borderTop: `1px solid ${C.line}`, margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>\u041E\u0441\u0442\u0430\u0442\u043E\u043A \u0432 \u0444\u043E\u043D\u0434\u0435</span>
              <span className="num" style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, color: adsFundBalance >= 0 ? C.gold : C.red }}>{rub(adsFundBalance)}</span>
            </div>
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>\u041D\u0430\u043B\u043E\u0433\u0438 \u043A \u0443\u043F\u043B\u0430\u0442\u0435 \u0437\u0430 \u043F\u0435\u0440\u0438\u043E\u0434</div>
            <div className="num" style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, color: C.clay }}>{rub(P.vat + P.usn)}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>\u041D\u0414\u0421 {rub(P.vat)} + \u0423\u0421\u041D {rub(P.usn)}</div>
          </div>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "18px 20px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, marginBottom: 16 }}>\u041E\u0431\u043E\u0440\u043E\u0442 \u043F\u043E \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u0430\u043C \u00B7 \u0437\u0430 \u0432\u0441\u0451 \u0432\u0440\u0435\u043C\u044F</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {byCp.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 150, fontSize: 13.5, fontWeight: 500, flexShrink: 0 }}>{c.name}</div>
              <div style={{ flex: 1, background: C.paper, borderRadius: 6, height: 26, overflow: "hidden" }}>
                <div style={{ width: `${(c.revenue / maxRev) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.moss}, #3d8a63)`, borderRadius: 6 }} />
              </div>
              <div className="num" style={{ width: 90, textAlign: "right", fontSize: 13.5, fontWeight: 600 }}>{rub(c.revenue)}</div>
            </div>
          ))}
          {!byCp.length && <div style={{ color: C.muted, fontSize: 13 }}>\u041D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445</div>}
        </div>
      </div>
    </div>
  );
}
